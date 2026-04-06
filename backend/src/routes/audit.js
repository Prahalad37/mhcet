import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { adminOnly } from "../middleware/requireAdmin.js";

export const auditRouter = Router();

// All audit routes require admin role
auditRouter.use(adminOnly);

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  userId: z.string().uuid().optional(),
  resourceType: z.enum(['test', 'question', 'user', 'import']).optional(),
  action: z.enum(['create', 'update', 'delete', 'import']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

function mapAuditLog(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    oldData: row.old_data,
    newData: row.new_data,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}

// Get audit logs with filtering and pagination
auditRouter.get("/logs", async (req, res, next) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    
    // Build dynamic WHERE clause
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    if (query.userId) {
      conditions.push(`a.user_id = $${paramIndex++}`);
      values.push(query.userId);
    }
    
    if (query.resourceType) {
      conditions.push(`a.resource_type = $${paramIndex++}`);
      values.push(query.resourceType);
    }
    
    if (query.action) {
      conditions.push(`a.action = $${paramIndex++}`);
      values.push(query.action);
    }
    
    if (query.startDate) {
      conditions.push(`a.created_at >= $${paramIndex++}`);
      values.push(query.startDate);
    }
    
    if (query.endDate) {
      conditions.push(`a.created_at <= $${paramIndex++}`);
      values.push(query.endDate);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM audit_logs a
      ${whereClause}
    `;
    const { rows: countRows } = await pool.query(countQuery, values);
    const total = countRows[0].total;
    
    // Get paginated results
    const dataQuery = `
      SELECT a.*, u.email as user_email
      FROM audit_logs a
      JOIN users u ON u.id = a.user_id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(query.limit, offset);
    
    const { rows } = await pool.query(dataQuery, values);
    
    res.json({
      logs: rows.map(mapAuditLog),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

// Get audit log statistics
auditRouter.get("/stats", async (req, res, next) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*)::int as total_logs,
        COUNT(DISTINCT user_id)::int as active_admins,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int as logs_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as logs_7d,
        COUNT(*) FILTER (WHERE action = 'create')::int as creates,
        COUNT(*) FILTER (WHERE action = 'update')::int as updates,
        COUNT(*) FILTER (WHERE action = 'delete')::int as deletes,
        COUNT(*) FILTER (WHERE action = 'import')::int as imports
      FROM audit_logs
    `);
    
    // Get recent activity by resource type
    const activityStats = await pool.query(`
      SELECT 
        resource_type,
        COUNT(*)::int as count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY resource_type
      ORDER BY count DESC
    `);
    
    res.json({
      ...stats.rows[0],
      activityByResource: activityStats.rows,
    });
  } catch (e) {
    next(e);
  }
});

// Get audit logs for a specific resource
auditRouter.get("/resource/:resourceType/:resourceId", async (req, res, next) => {
  try {
    const { resourceType, resourceId } = req.params;
    
    const { rows } = await pool.query(`
      SELECT a.*, u.email as user_email
      FROM audit_logs a
      JOIN users u ON u.id = a.user_id
      WHERE a.resource_type = $1 AND a.resource_id = $2
      ORDER BY a.created_at DESC
    `, [resourceType, resourceId]);
    
    res.json(rows.map(mapAuditLog));
  } catch (e) {
    next(e);
  }
});
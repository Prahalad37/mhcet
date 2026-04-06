import { pool } from "../db/pool.js";

/**
 * Audit logger middleware for admin operations
 * Captures request/response data and logs admin actions
 */
export function auditLogger(action, resourceType) {
  return (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log the audit entry asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await logAuditEntry({
            userId: req.userId,
            action,
            resourceType,
            resourceId: extractResourceId(req, data),
            oldData: req.auditOldData || null,
            newData: extractNewData(req, data),
            metadata: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query,
              ip: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
              timestamp: new Date().toISOString(),
            }
          });
        } catch (e) {
          console.error('Audit logging failed:', e);
        }
      });
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * Middleware to capture old data before updates/deletes
 */
export function captureOldData(resourceType, idParam = 'id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[idParam];
      if (!resourceId) return next();
      
      let query;
      switch (resourceType) {
        case 'test':
          query = 'SELECT * FROM tests WHERE id = $1';
          break;
        case 'question':
          query = 'SELECT * FROM questions WHERE id = $1';
          break;
        case 'user':
          query = 'SELECT id, email, role, created_at FROM users WHERE id = $1';
          break;
        default:
          return next();
      }
      
      const { rows } = await pool.query(query, [resourceId]);
      if (rows.length > 0) {
        req.auditOldData = rows[0];
      }
    } catch (e) {
      console.error('Failed to capture old data for audit:', e);
    }
    
    next();
  };
}

/**
 * Log audit entry to database
 */
async function logAuditEntry({ userId, action, resourceType, resourceId, oldData, newData, metadata }) {
  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_data, new_data, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      userId,
      action,
      resourceType,
      resourceId || null,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      JSON.stringify(metadata)
    ]);
  } catch (e) {
    console.error('Failed to write audit log:', e);
  }
}

/**
 * Extract resource ID from request or response
 */
function extractResourceId(req, responseData) {
  // Try to get ID from response data first
  if (responseData && typeof responseData === 'object') {
    if (responseData.id) return responseData.id;
    if (responseData.test && responseData.test.id) return responseData.test.id;
    if (responseData.question && responseData.question.id) return responseData.question.id;
    if (responseData.user && responseData.user.id) return responseData.user.id;
  }
  
  // Fall back to request params
  return req.params.id || req.params.testId || req.params.questionId || req.params.userId || null;
}

/**
 * Extract new data from request body or response
 */
function extractNewData(req, responseData) {
  // For creates, use response data
  if (req.method === 'POST' && responseData) {
    return responseData;
  }
  
  // For updates, use request body
  if (req.method === 'PUT' || req.method === 'PATCH') {
    return req.body;
  }
  
  // For imports, use summary data
  if (responseData && responseData.imported !== undefined) {
    return {
      imported: responseData.imported,
      total: responseData.total,
      testTitle: responseData.testTitle
    };
  }
  
  return null;
}

/**
 * Convenience functions for common audit scenarios
 */
export const auditCreate = (resourceType) => auditLogger('create', resourceType);
export const auditUpdate = (resourceType) => auditLogger('update', resourceType);
export const auditDelete = (resourceType) => auditLogger('delete', resourceType);
export const auditImport = (resourceType) => auditLogger('import', resourceType);
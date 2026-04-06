-- Audit logging system for admin operations
-- Tracks all admin actions for compliance and debugging

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'import', etc.
  resource_type TEXT NOT NULL, -- 'test', 'question', 'user', etc.
  resource_id UUID, -- ID of the affected resource (nullable for bulk operations)
  old_data JSONB, -- Previous state (for updates/deletes)
  new_data JSONB, -- New state (for creates/updates)
  metadata JSONB, -- Additional context (IP, user agent, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

-- Composite index for common queries
CREATE INDEX idx_audit_logs_user_resource ON audit_logs (user_id, resource_type, created_at DESC);
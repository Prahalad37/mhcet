-- B2B multi-tenant prep: coaching institutes as tenants.
-- tenant_id = NULL on users/tests/attempts means direct B2C (PrepMaster platform). No NOT NULL on legacy rows.

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenants_status ON tenants (status);

ALTER TABLE users
  ADD COLUMN tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL;

CREATE INDEX idx_users_tenant_id ON users (tenant_id);

ALTER TABLE tests
  ADD COLUMN tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL;

CREATE INDEX idx_tests_tenant_id ON tests (tenant_id);

ALTER TABLE attempts
  ADD COLUMN tenant_id UUID REFERENCES tenants (id) ON DELETE SET NULL;

CREATE INDEX idx_attempts_tenant_id ON attempts (tenant_id);

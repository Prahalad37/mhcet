-- Add user roles for admin functionality
-- Default all existing users to 'user' role, admins can be promoted later

-- Add role column with default value
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Add constraint to ensure valid roles
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- Create index for efficient role-based queries
CREATE INDEX idx_users_role ON users (role);

-- Optional: Create first admin user (uncomment and modify email as needed)
-- UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
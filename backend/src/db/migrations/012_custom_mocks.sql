ALTER TABLE tests ADD COLUMN author_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX idx_tests_author_id ON tests(author_id);

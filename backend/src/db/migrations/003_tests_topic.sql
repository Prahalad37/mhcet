-- Per-test topic for analytics (weak areas, recommendations)
ALTER TABLE tests ADD COLUMN topic TEXT NOT NULL DEFAULT 'General';

UPDATE tests SET topic = 'Legal Reasoning' WHERE title ILIKE '%legal reasoning%';
UPDATE tests SET topic = 'Constitutional Law' WHERE title ILIKE '%constitutional%';

CREATE INDEX idx_tests_topic ON tests (topic);

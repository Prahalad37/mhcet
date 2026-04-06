-- Per-question subject tag for topic-wise practice mode.
-- Pattern per mock: order_index 1-8 Legal, 9-14 GK, 15-22 Logical, 23-24 Math, 25-30 English.
ALTER TABLE questions ADD COLUMN subject TEXT;

UPDATE questions SET subject = CASE
  WHEN order_index BETWEEN 1 AND 8  THEN 'Legal Aptitude'
  WHEN order_index BETWEEN 9 AND 14 THEN 'GK & Current Affairs'
  WHEN order_index BETWEEN 15 AND 22 THEN 'Logical Reasoning'
  WHEN order_index BETWEEN 23 AND 24 THEN 'Basic Math'
  WHEN order_index BETWEEN 25 AND 30 THEN 'English'
END;

ALTER TABLE questions ALTER COLUMN subject SET NOT NULL;

CREATE INDEX idx_questions_subject ON questions (subject);

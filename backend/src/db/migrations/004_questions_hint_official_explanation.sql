-- Shown only on GET /api/attempts/:id/results — never exposed on test start / resume / GET tests.
ALTER TABLE questions
  ADD COLUMN hint TEXT,
  ADD COLUMN official_explanation TEXT;

-- Migration 011 dropped question_explanations when decoupling AI, but the
-- explain service still needs a persistent cache to avoid re-calling the AI
-- on every request for the same question.  This migration restores the table.

CREATE TABLE IF NOT EXISTS question_explanations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID        NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  content_hash  TEXT        NOT NULL,
  answer        TEXT        NOT NULL,
  explanation   TEXT        NOT NULL,
  concept       TEXT        NOT NULL,
  example       TEXT        NOT NULL,
  model         TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, content_hash)
);

CREATE INDEX IF NOT EXISTS idx_question_explanations_lookup
  ON question_explanations (question_id, content_hash);

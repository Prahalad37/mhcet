CREATE TABLE question_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  concept TEXT NOT NULL,
  example TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, content_hash)
);

CREATE INDEX idx_question_explanations_lookup ON question_explanations (question_id, content_hash);

CREATE TABLE user_explanation_usage (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  openai_calls INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX idx_user_explanation_usage_date ON user_explanation_usage (usage_date);

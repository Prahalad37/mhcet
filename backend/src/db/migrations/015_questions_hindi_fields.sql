-- Optional Hindi copy per question; English columns remain canonical for correctness and fallbacks.
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS prompt_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_a_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_b_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_c_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_d_hi TEXT,
  ADD COLUMN IF NOT EXISTS hint_hi TEXT,
  ADD COLUMN IF NOT EXISTS official_explanation_hi TEXT;

-- Freeze Hindi (and English) text at submit for immutable results.
ALTER TABLE attempt_question_snapshots
  ADD COLUMN IF NOT EXISTS prompt_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_a_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_b_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_c_hi TEXT,
  ADD COLUMN IF NOT EXISTS option_d_hi TEXT,
  ADD COLUMN IF NOT EXISTS hint_hi TEXT,
  ADD COLUMN IF NOT EXISTS official_explanation_hi TEXT;

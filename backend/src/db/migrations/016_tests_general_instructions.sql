-- Pre-exam / general instructions (Markdown), editable from admin per test.
-- Hindi optional; UI falls back: hi -> general_instructions_hi -> general_instructions -> built-in template.

ALTER TABLE tests ADD COLUMN IF NOT EXISTS general_instructions TEXT NULL;
ALTER TABLE tests ADD COLUMN IF NOT EXISTS general_instructions_hi TEXT NULL;

-- Free vs paid: paid users have unlimited mock attempts; free users are capped per UTC day (see FREE_TESTS_PER_DAY).

ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';

ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'paid'));

CREATE INDEX idx_users_plan ON users (plan);

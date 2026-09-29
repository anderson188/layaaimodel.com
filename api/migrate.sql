-- Additive migration for existing D1 databases (run after schema.sql if tables already exist)

ALTER TABLE users ADD COLUMN pack_id TEXT;
ALTER TABLE users ADD COLUMN alert_email_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN alert_burn_pct INTEGER NOT NULL DEFAULT 80;
ALTER TABLE usage_events ADD COLUMN path TEXT;

CREATE TABLE IF NOT EXISTS anon_trials (
  ip_hash TEXT PRIMARY KEY,
  runs INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_grants (
  user_id TEXT NOT NULL,
  yyyymm TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  PRIMARY KEY (user_id, yyyymm)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_ts ON usage_events(user_id, ts);

ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;

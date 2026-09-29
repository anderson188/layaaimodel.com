-- Laya AI gateway schema (D1)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 0,
  pack_id TEXT,
  alert_email_enabled INTEGER NOT NULL DEFAULT 1,
  alert_burn_pct INTEGER NOT NULL DEFAULT 80,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  key_id TEXT,
  user_id TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  request_id TEXT,
  upstream_status INTEGER,
  path TEXT,
  ts TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage_events(ts);
CREATE INDEX IF NOT EXISTS idx_usage_key_ts ON usage_events(key_id, ts);
CREATE INDEX IF NOT EXISTS idx_usage_user_ts ON usage_events(user_id, ts);

CREATE TABLE IF NOT EXISTS rate_alerts (
  id TEXT PRIMARY KEY,
  key_id TEXT,
  user_id TEXT,
  reason TEXT NOT NULL,
  count INTEGER NOT NULL,
  ts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  processed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT,
  ts TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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

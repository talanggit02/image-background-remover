-- BGRemover D1 Database Schema

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  google_id TEXT NOT NULL UNIQUE,
  name TEXT,
  picture TEXT,
  gift_credits INTEGER NOT NULL DEFAULT 3,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS user_credits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  credits_balance INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'none',  -- none | basic | pro | enterprise
  billing_cycle TEXT DEFAULT 'monthly', -- monthly | yearly
  status TEXT NOT NULL DEFAULT 'inactive', -- active | inactive | cancelled
  monthly_quota INTEGER NOT NULL DEFAULT 0,
  quota_used INTEGER NOT NULL DEFAULT 0,
  start_at INTEGER,
  renew_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  used_at INTEGER NOT NULL DEFAULT (unixepoch()),
  deduct_from TEXT NOT NULL -- gift | credits | subscription
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL, -- credits | subscription
  plan TEXT, -- starter | standard | large | basic | pro | enterprise
  amount REAL NOT NULL,
  credits_granted INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | completed | failed
  payment_method TEXT DEFAULT 'paypal',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

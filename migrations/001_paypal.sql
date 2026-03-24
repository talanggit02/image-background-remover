-- Migration: Add PayPal fields
-- Run: wrangler d1 execute bgremover-db --file=migrations/001_paypal.sql

-- 给 subscriptions 表添加 PayPal 订阅 ID 字段
ALTER TABLE subscriptions ADD COLUMN paypal_subscription_id TEXT;

-- 给 orders 表添加 PayPal 相关字段
ALTER TABLE orders ADD COLUMN paypal_order_id TEXT;
ALTER TABLE orders ADD COLUMN paypal_capture_id TEXT;

-- 新增 payment_orders 用于幂等去重（可选，如果 orders 表够用则跳过）
CREATE TABLE IF NOT EXISTS payment_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  paypal_order_id TEXT,
  paypal_capture_id TEXT UNIQUE,
  amount REAL,
  credits INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_capture_id ON payment_orders(paypal_capture_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_id ON subscriptions(paypal_subscription_id);

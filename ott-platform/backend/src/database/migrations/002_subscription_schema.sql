-- =============================================================
-- MIGRATION 002 — Subscription, Payment, Coupon tables
-- Run after 001_initial_schema.sql
-- =============================================================

-- subscription_plans already created in 001.
-- Add play_purchase_token column to subscriptions if not present.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS play_purchase_token TEXT;

-- ── Payments: add gateway + discount columns ─────────────────

DO $$ BEGIN
  CREATE TYPE payment_gateway AS ENUM ('razorpay', 'google_play', 'free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS gateway           payment_gateway DEFAULT 'razorpay',
  ADD COLUMN IF NOT EXISTS razorpay_signature TEXT,
  ADD COLUMN IF NOT EXISTS play_order_id     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS play_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS coupon_code       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_amount   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_number    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS invoice_url       TEXT,
  ADD COLUMN IF NOT EXISTS plan_id           INT REFERENCES subscription_plans(id);

-- ── Coupons ───────────────────────────────────────────────────

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_amount_inr NUMERIC(10,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS coupons (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(50) UNIQUE NOT NULL,
    discount_type  VARCHAR(10) NOT NULL,     -- 'percent' | 'flat'
    discount_value NUMERIC(10,2) NOT NULL,
    max_uses       INT,
    used_count     INT DEFAULT 0,
    min_amount_inr NUMERIC(10,2) DEFAULT 0,
    plan_id        INT REFERENCES subscription_plans(id),
    expires_at     TIMESTAMPTZ,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code     ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active   ON coupons(is_active) WHERE is_active = true;

-- ── Seed: example coupon ──────────────────────────────────────

INSERT INTO coupons (code, discount_type, discount_value, max_uses, expires_at)
VALUES
  ('WELCOME50',  'percent', 50,  1000, NOW() + INTERVAL '90 days'),
  ('FLAT99',     'flat',    99,   500, NOW() + INTERVAL '30 days'),
  ('OTT2024',    'percent', 20,  NULL, NOW() + INTERVAL '365 days')
ON CONFLICT (code) DO NOTHING;

-- ── Indexes for payment queries ────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_payments_user    ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order   ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status  ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- ── Subscription expiry index ─────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sub_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_sub_expires     ON subscriptions(expires_at)
  WHERE status IN ('active', 'trial');

-- ── View: active subscribers ─────────────────────────────────

CREATE OR REPLACE VIEW active_subscribers AS
  SELECT
    u.id         AS user_id,
    u.email,
    u.display_name,
    s.id         AS subscription_id,
    s.status,
    s.expires_at,
    sp.name      AS plan_name,
    sp.plan_type,
    sp.max_devices,
    sp.max_quality
  FROM subscriptions s
  JOIN users              u  ON u.id  = s.user_id
  JOIN subscription_plans sp ON sp.id = s.plan_id
  WHERE s.status IN ('active', 'trial')
    AND s.expires_at > NOW();

SELECT 'Migration 002 completed' AS result;

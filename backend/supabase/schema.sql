-- ============================================================
-- GolfGives — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor on a fresh project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'subscriber' CHECK (role IN ('subscriber', 'admin')),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CHARITIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE charities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  image_url       TEXT,
  website_url     TEXT,
  is_featured     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  total_donated   DECIMAL(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  charity_id            UUID REFERENCES charities(id),
  plan_type             TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'lapsed', 'pending')),
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  charity_percentage    INTEGER DEFAULT 10 CHECK (charity_percentage BETWEEN 10 AND 50),
  amount_pence          INTEGER NOT NULL,         -- store in pence
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- GOLF SCORES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE golf_scores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL CHECK (score BETWEEN 1 AND 45),
  played_on   DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Each user keeps only their latest 5 scores.
-- This trigger deletes the oldest when a 6th is inserted.
CREATE OR REPLACE FUNCTION enforce_five_score_limit()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM golf_scores
  WHERE id IN (
    SELECT id FROM golf_scores
    WHERE user_id = NEW.user_id
    ORDER BY played_on DESC, created_at DESC
    OFFSET 5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_five_score_limit
AFTER INSERT ON golf_scores
FOR EACH ROW EXECUTE FUNCTION enforce_five_score_limit();

-- ─────────────────────────────────────────────────────────────
-- DRAWS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE draws (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_month      TEXT NOT NULL,                  -- e.g. '2026-03'
  draw_type       TEXT NOT NULL DEFAULT 'random' CHECK (draw_type IN ('random', 'algorithmic')),
  drawn_numbers   INTEGER[] NOT NULL,             -- array of 5 numbers
  status          TEXT NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated', 'published', 'archived')),
  prize_pool_5    DECIMAL(10,2) DEFAULT 0,
  prize_pool_4    DECIMAL(10,2) DEFAULT 0,
  prize_pool_3    DECIMAL(10,2) DEFAULT 0,
  jackpot_rolled  BOOLEAN DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- DRAW ENTRIES (snapshot of user's scores at draw time)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE draw_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id         UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entry_numbers   INTEGER[] NOT NULL,             -- user's 5 scores at draw time
  match_count     INTEGER DEFAULT 0,
  is_winner       BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(draw_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- WINNER PAYOUTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE winner_payouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_entry_id   UUID NOT NULL REFERENCES draw_entries(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  draw_id         UUID NOT NULL REFERENCES draws(id),
  match_type      TEXT NOT NULL CHECK (match_type IN ('5_match', '4_match', '3_match')),
  gross_amount    DECIMAL(10,2) NOT NULL,
  proof_url       TEXT,
  proof_status    TEXT DEFAULT 'awaiting' CHECK (proof_status IN ('awaiting', 'pending_review', 'approved', 'rejected')),
  payment_status  TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  admin_notes     TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- CHARITY DONATIONS LEDGER
-- ─────────────────────────────────────────────────────────────
CREATE TABLE charity_donations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  charity_id      UUID NOT NULL REFERENCES charities(id),
  subscription_id UUID REFERENCES subscriptions(id),
  amount          DECIMAL(10,2) NOT NULL,
  donation_month  TEXT NOT NULL,                  -- e.g. '2026-03'
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_golf_scores_user      ON golf_scores(user_id, played_on DESC);
CREATE INDEX idx_subscriptions_user    ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe  ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_draw_entries_draw     ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user     ON draw_entries(user_id);
CREATE INDEX idx_payouts_user          ON winner_payouts(user_id);

-- ─────────────────────────────────────────────────────────────
-- SEED: Charities
-- ─────────────────────────────────────────────────────────────
INSERT INTO charities (name, description, category, is_featured) VALUES
  ('Golf Foundation', 'Supporting youth development in golf across the UK.', 'Youth Sport', true),
  ('Cancer Research UK', 'Funding life-saving cancer research through golf fundraising events.', 'Health', false),
  ('Macmillan Cancer Support', 'Annual golf charity days raising funds for Macmillan nurses.', 'Healthcare', false),
  ('Sports Aid', 'Helping elite young athletes fund their sporting dreams.', 'Sport', false),
  ('Children in Need', 'BBC charity supporting disadvantaged children across the UK.', 'Children', false);

-- ─────────────────────────────────────────────────────────────
-- SEED: Admin User (change password after first login!)
-- password: Admin@Golf2026  (bcrypt hash below — regenerate in prod)
-- ─────────────────────────────────────────────────────────────
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@golfgives.co.uk',
   '$2b$12$placeholder_replace_with_real_bcrypt_hash',
   'GolfGives Admin',
   'admin');

-- ─────────────────────────────────────────────────────────────
-- RPC: increment charity total (called from webhook)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_charity_total(charity_id_param UUID, amount_param DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE charities
  SET total_donated = total_donated + amount_param
  WHERE id = charity_id_param;
END;
$$ LANGUAGE plpgsql;

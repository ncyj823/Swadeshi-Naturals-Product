-- Swadeshi Natural Products — PostgreSQL schema (Neon)
-- Run once against a fresh database.

BEGIN;

CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT 'Customer',
  phone       TEXT,
  email       TEXT,
  loc         TEXT NOT NULL DEFAULT '',
  orders      INTEGER NOT NULL DEFAULT 0,
  spend       NUMERIC(12,2) NOT NULL DEFAULT 0,
  since       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);

CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  title       TEXT NOT NULL,
  cat         TEXT NOT NULL DEFAULT 'cosmetic',
  cat_label   TEXT NOT NULL DEFAULT 'cosmetic',
  telugu      TEXT NOT NULL DEFAULT 'Standard pack',
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  old_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount    NUMERIC(5,2)  NOT NULL DEFAULT 0,
  stock       INTEGER NOT NULL DEFAULT 0,
  rating      NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  seller      TEXT NOT NULL DEFAULT 'Swadeshi Natural Products',
  delivery    TEXT NOT NULL DEFAULT 'Delivery in 2-4 days',
  description TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT '',
  images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  color       TEXT NOT NULL DEFAULT '#8a9a52',
  initials    TEXT NOT NULL DEFAULT '',
  featured    BOOLEAN NOT NULL DEFAULT true,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_cat    ON products (cat);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer        TEXT NOT NULL DEFAULT 'Customer',
  customer_phone  TEXT NOT NULL DEFAULT '',
  customer_email  TEXT NOT NULL DEFAULT '',
  locality        TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  notes           TEXT NOT NULL DEFAULT '',
  items           INTEGER NOT NULL DEFAULT 0,
  item_details    JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_status  TEXT NOT NULL DEFAULT 'Completed',
  status          TEXT NOT NULL DEFAULT 'Paid',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_phone      ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
-- speeds up the ID substring lookups used by /api/orders/track
CREATE INDEX IF NOT EXISTS idx_orders_id_lower   ON orders (lower(id));

COMMIT;

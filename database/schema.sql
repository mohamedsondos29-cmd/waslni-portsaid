-- Waslni production-ready relational schema (PostgreSQL/Supabase)
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('normal','accessibility')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accessibility_profiles (
  customer_id UUID PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
  need_type TEXT,
  wheelchair BOOLEAN NOT NULL DEFAULT false,
  ramp BOOLEAN NOT NULL DEFAULT false,
  hydraulic_lift BOOLEAN NOT NULL DEFAULT false,
  audio_guidance BOOLEAN NOT NULL DEFAULT false,
  visual_display BOOLEAN NOT NULL DEFAULT false,
  priority_seat BOOLEAN NOT NULL DEFAULT false,
  driver_assistance BOOLEAN NOT NULL DEFAULT false,
  preferred_vehicle_id TEXT,
  notes TEXT
);

CREATE TABLE transport_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  card_number_last4 CHAR(4) NOT NULL,
  qr_token_hash TEXT UNIQUE NOT NULL,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES transport_cards(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('top_up','fare','refund')),
  amount NUMERIC(10,2) NOT NULL,
  route_id INTEGER,
  ticket_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  line TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  wheelchair_spaces INTEGER NOT NULL DEFAULT 0,
  ramp BOOLEAN NOT NULL DEFAULT false,
  hydraulic_lift BOOLEAN NOT NULL DEFAULT false,
  audio_guidance BOOLEAN NOT NULL DEFAULT false,
  visual_display BOOLEAN NOT NULL DEFAULT false,
  priority_seats INTEGER NOT NULL DEFAULT 0,
  usb_charging BOOLEAN NOT NULL DEFAULT false,
  driver_assistance BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'available',
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7)
);

CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_cards_customer ON transport_cards(customer_id);
CREATE INDEX idx_transactions_card ON card_transactions(card_id, created_at DESC);
CREATE INDEX idx_accessibility_needs ON accessibility_profiles(wheelchair, ramp, hydraulic_lift);

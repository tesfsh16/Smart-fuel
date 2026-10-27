-- SmartFuel operational schema: inventory, reservations, queue, transactions, delivery.
-- Builds on 001_initial (stations, fuel_types, users, distributors).

-- Vehicles (owned by driver users)
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT,
  fuel_type_id INTEGER REFERENCES fuel_types(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory: one row per station + fuel type
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  capacity NUMERIC(12,2) NOT NULL DEFAULT 0,
  threshold_low NUMERIC(12,2) NOT NULL DEFAULT 0,
  threshold_critical NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, fuel_type_id)
);

-- Append-only ledger of every stock change (the audit trail for inventory)
CREATE TABLE inventory_movements (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,   -- receiving | sale | adjustment | reservation_hold | reservation_release
  quantity NUMERIC(12,2) NOT NULL,  -- signed: + in, - out
  balance_after NUMERIC(12,2) NOT NULL,
  reason TEXT,
  ref_type TEXT,                 -- reservation | delivery | manual
  ref_id INTEGER,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movements_station ON inventory_movements (station_id, created_at DESC);
CREATE INDEX idx_movements_fuel ON inventory_movements (station_id, fuel_type_id);

-- Reservations
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  amount_l NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',   -- active | completed | expired | no_show | cancelled
  queue_number INTEGER,
  code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_reservations_station_status ON reservations (station_id, status);

-- Queue entries (one per active reservation)
CREATE TABLE queue_entries (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',   -- waiting | served | skipped
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  served_at TIMESTAMPTZ
);

CREATE INDEX idx_queue_station_status ON queue_entries (station_id, status);

-- Transactions (actual fuel dispensed)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  quantity_l NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_station_day ON transactions (station_id, created_at DESC);

-- Supply requests (station -> distributor)
CREATE TABLE supply_requests (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  distributor_id INTEGER NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | fulfilled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deliveries (distributor -> station)
CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  distributor_id INTEGER NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | in_transit | completed | cancelled
  scheduled_at TIMESTAMPTZ,
  departed_at TIMESTAMPTZ,
  arrived_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_station ON deliveries (station_id, status);

-- Delivery items (one delivery can carry multiple fuel types)
CREATE TABLE delivery_items (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  fuel_type_id INTEGER NOT NULL REFERENCES fuel_types(id) ON DELETE CASCADE,
  expected_quantity NUMERIC(12,2) NOT NULL,
  received_quantity NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'pending'   -- pending | received | discrepancy
);

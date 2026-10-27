-- SmartFuel initial schema: identity, tenancy, reference data.
-- Each station-scoped query is filtered by the caller's station assignment
-- at the repository layer. Hiding data in the UI is not sufficient.

-- Roles (reference)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

INSERT INTO roles (name, description) VALUES
  ('DRIVER', 'Can manage own profile, vehicles and reservations'),
  ('STATION_STAFF', 'Operates an assigned station'),
  ('STATION_MANAGER', 'Station operations plus reports'),
  ('CHAIN_ADMIN', 'Manages owned stations within a chain'),
  ('DISTRIBUTOR_USER', 'Distributor operations'),
  ('AUTHORITY', 'Authorized regional or national data access'),
  ('PLATFORM_ADMIN', 'Full platform administration');

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles with optional scope (station / organization / distributor)
-- scope_type NULL means a global role (e.g. AUTHORITY, PLATFORM_ADMIN).
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  scope_type TEXT,      -- 'station' | 'organization' | 'distributor' | NULL
  scope_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id, scope_type, scope_id)
);

-- Organizations (station companies, distributors, authorities, platform)
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- station_company | distributor | authority | platform
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Station chains (optional grouping under an organization)
CREATE TABLE station_chains (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stations (the core tenant boundary)
CREATE TABLE stations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chain_id INTEGER REFERENCES station_chains(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  city TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links users to a station with an operational role
CREATE TABLE station_staff (
  id SERIAL PRIMARY KEY,
  station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- staff | manager
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (station_id, user_id)
);

-- Distributors
CREATE TABLE distributors (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fuel types (reference)
CREATE TABLE fuel_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE
);

INSERT INTO fuel_types (name, code) VALUES
  ('Petrol', 'PETROL'),
  ('Diesel', 'DIESEL');

-- Refresh tokens (rotated JWT refresh flow)
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);

-- Audit log (append-only)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);

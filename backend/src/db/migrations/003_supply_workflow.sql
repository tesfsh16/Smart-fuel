-- Extend supply_requests for the authority approval workflow.
-- Stations request fuel → authority reviews & can adjust amount → distributor fulfils.

ALTER TABLE supply_requests
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS authority_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS authority_approved_quantity NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS authority_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_id INTEGER REFERENCES deliveries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Status now: pending | authority_approved | authority_rejected | in_delivery | fulfilled
-- Extend the existing check by updating the default comment only — no constraint exists to drop.

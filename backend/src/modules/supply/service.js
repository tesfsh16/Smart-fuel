import { query } from "../../db/pool.js";
import { ApiError } from "../../middleware/error.js";

const BASE_SELECT = `
  SELECT
    sr.id, sr.status, sr.quantity, sr.notes,
    sr.authority_approved_quantity, sr.authority_reviewed_at,
    sr.created_at, sr.updated_at,
    s.id AS station_id, s.name AS station_name, s.region AS station_region,
    ft.name AS fuel_name, ft.code AS fuel_code,
    dist.id AS distributor_id,
    org.name AS distributor_name,
    au.full_name AS authority_reviewer,
    d.id AS delivery_id, d.status AS delivery_status, d.scheduled_at
  FROM supply_requests sr
  JOIN stations s      ON s.id = sr.station_id
  JOIN fuel_types ft   ON ft.id = sr.fuel_type_id
  JOIN distributors dist ON dist.id = sr.distributor_id
  JOIN organizations org ON org.id = dist.organization_id
  LEFT JOIN users au   ON au.id = sr.authority_id
  LEFT JOIN deliveries d ON d.id = sr.delivery_id
`;

// ── station ────────────────────────────────────────────────────────────────

export async function stationCreateRequest(stationId, { fuelCode, quantity, notes }) {
  const { rows: ft } = await query(
    `SELECT id FROM fuel_types WHERE code = $1`, [fuelCode.toUpperCase()]
  );
  if (!ft[0]) throw new ApiError(400, "Unknown fuel type.");

  const { rows: dist } = await query(
    `SELECT d.id FROM distributors d WHERE d.status = 'active' LIMIT 1`
  );
  if (!dist[0]) throw new ApiError(400, "No active distributor found. Contact your administrator.");

  const { rows } = await query(
    `INSERT INTO supply_requests
       (station_id, distributor_id, fuel_type_id, quantity, notes, status)
     VALUES ($1,$2,$3,$4,$5,'pending')
     RETURNING id`,
    [stationId, dist[0].id, ft[0].id, quantity, notes || null]
  );
  return { id: rows[0].id };
}

export async function stationGetRequests(stationId) {
  const { rows } = await query(
    `${BASE_SELECT} WHERE sr.station_id = $1 ORDER BY sr.created_at DESC`,
    [stationId]
  );
  return rows;
}

// ── authority ──────────────────────────────────────────────────────────────

export async function authorityGetRequests() {
  const { rows } = await query(
    `${BASE_SELECT} ORDER BY sr.created_at DESC`
  );
  return rows;
}

export async function authorityReview(userId, requestId, { action, approvedQuantity, notes }) {
  // action: "approve" | "reject"
  const { rows } = await query(
    `SELECT id, status, quantity FROM supply_requests WHERE id = $1`, [requestId]
  );
  if (!rows[0]) throw new ApiError(404, "Supply request not found.");
  if (!["pending"].includes(rows[0].status)) {
    throw new ApiError(400, "Only pending requests can be reviewed.");
  }

  const newStatus = action === "approve" ? "authority_approved" : "authority_rejected";
  const finalQty  = action === "approve"
    ? (approvedQuantity ?? rows[0].quantity)
    : rows[0].quantity;

  const { rows: updated } = await query(
    `UPDATE supply_requests
        SET status = $1,
            authority_id = $2,
            authority_approved_quantity = $3,
            authority_reviewed_at = NOW(),
            notes = COALESCE($4, notes),
            updated_at = NOW()
      WHERE id = $5
      RETURNING id, status, authority_approved_quantity`,
    [newStatus, userId, finalQty, notes || null, requestId]
  );
  return updated[0];
}

// ── distributor ────────────────────────────────────────────────────────────

export async function distributorGetRequests(userId) {
  // Get distributor id for this user
  const { rows: ur } = await query(
    `SELECT ur.scope_id FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND r.name = 'DISTRIBUTOR_USER'
        AND ur.scope_type = 'distributor' LIMIT 1`,
    [userId]
  );
  const distId = ur[0]?.scope_id ?? null;

  const { rows } = await query(
    `${BASE_SELECT}
      WHERE ($1::INT IS NULL OR sr.distributor_id = $1)
        AND sr.status IN ('authority_approved','in_delivery','fulfilled')
      ORDER BY sr.created_at DESC`,
    [distId]
  );
  return rows;
}

export async function distributorFulfil(userId, requestId, scheduledAt) {
  const { pool } = await import("../../db/pool.js");
  const client   = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT sr.*, ft.id AS fuel_type_id
         FROM supply_requests sr
         JOIN fuel_types ft ON ft.id = sr.fuel_type_id
        WHERE sr.id = $1 AND sr.status = 'authority_approved'`,
      [requestId]
    );
    if (!rows[0]) throw new ApiError(404, "Approved request not found.");
    const req = rows[0];

    // Create delivery
    const { rows: del } = await client.query(
      `INSERT INTO deliveries
         (distributor_id, station_id, status, scheduled_at, created_by)
       VALUES ($1,$2,'scheduled',$3,$4) RETURNING id`,
      [req.distributor_id, req.station_id, scheduledAt ?? new Date(Date.now() + 86_400_000), userId]
    );
    const deliveryId = del[0].id;

    await client.query(
      `INSERT INTO delivery_items (delivery_id, fuel_type_id, expected_quantity)
       VALUES ($1,$2,$3)`,
      [deliveryId, req.fuel_type_id, req.authority_approved_quantity ?? req.quantity]
    );

    // Link delivery to request + update status
    await client.query(
      `UPDATE supply_requests
          SET delivery_id = $1, status = 'in_delivery', updated_at = NOW()
        WHERE id = $2`,
      [deliveryId, requestId]
    );

    await client.query("COMMIT");
    return { deliveryId, requestId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

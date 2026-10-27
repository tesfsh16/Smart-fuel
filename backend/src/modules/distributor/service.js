import { query } from "../../db/pool.js";
import { ApiError } from "../../middleware/error.js";

// ── helpers ────────────────────────────────────────────────────────────────

async function getDistributorId(userId) {
  // PLATFORM_ADMIN doesn't have a distributor scope — let them see all.
  const { rows } = await query(
    `SELECT ur.scope_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND r.name = 'DISTRIBUTOR_USER'
        AND ur.scope_type = 'distributor'
      LIMIT 1`,
    [userId]
  );
  return rows[0]?.scope_id ?? null;
}

// ── deliveries ─────────────────────────────────────────────────────────────

export async function getDeliveries(userId) {
  const distributorId = await getDistributorId(userId);

  const { rows } = await query(
    `SELECT
       d.id, d.status, d.scheduled_at, d.departed_at, d.arrived_at, d.created_at,
       s.name AS station_name, s.region AS station_region, s.address AS station_address,
       org.name AS distributor_name,
       json_agg(
         json_build_object(
           'fuelName',          ft.name,
           'fuelCode',          ft.code,
           'expectedQuantity',  di.expected_quantity,
           'receivedQuantity',  di.received_quantity,
           'itemStatus',        di.status
         ) ORDER BY ft.name
       ) AS items
     FROM deliveries d
     JOIN stations s       ON s.id = d.station_id
     JOIN distributors dist ON dist.id = d.distributor_id
     JOIN organizations org ON org.id = dist.organization_id
     JOIN delivery_items di ON di.delivery_id = d.id
     JOIN fuel_types ft     ON ft.id = di.fuel_type_id
     WHERE ($1::INT IS NULL OR d.distributor_id = $1)
     GROUP BY d.id, s.name, s.region, s.address, org.name
     ORDER BY d.scheduled_at DESC`,
    [distributorId]
  );
  return rows;
}

export async function createDelivery(userId, { stationId, items, scheduledAt }) {
  const { pool } = await import("../../db/pool.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const distributorId = await getDistributorId(userId);
    if (!distributorId) throw new ApiError(403, "No distributor assigned to your account.");

    // Validate station
    const { rows: stRows } = await client.query(
      `SELECT id FROM stations WHERE id = $1 AND status = 'active'`,
      [stationId]
    );
    if (!stRows[0]) throw new ApiError(404, "Station not found.");

    const { rows: delRows } = await client.query(
      `INSERT INTO deliveries
         (distributor_id, station_id, status, scheduled_at, created_by)
       VALUES ($1, $2, 'scheduled', $3, $4)
       RETURNING id`,
      [distributorId, stationId, scheduledAt, userId]
    );
    const deliveryId = delRows[0].id;

    for (const item of items) {
      const { rows: ftRows } = await client.query(
        `SELECT id FROM fuel_types WHERE code = $1`,
        [item.fuelCode.toUpperCase()]
      );
      if (!ftRows[0]) throw new ApiError(400, `Unknown fuel code: ${item.fuelCode}`);

      await client.query(
        `INSERT INTO delivery_items
           (delivery_id, fuel_type_id, expected_quantity)
         VALUES ($1, $2, $3)`,
        [deliveryId, ftRows[0].id, item.expectedQuantity]
      );
    }

    await client.query("COMMIT");

    const { rows: created } = await client.query(
      `SELECT d.id, d.status, d.scheduled_at,
              s.name AS station_name
         FROM deliveries d
         JOIN stations s ON s.id = d.station_id
        WHERE d.id = $1`,
      [deliveryId]
    );
    return created[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateDeliveryStatus(userId, deliveryId, status) {
  const allowed = ["in_transit", "completed", "cancelled"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(", ")}`);
  }

  const distributorId = await getDistributorId(userId);

  const { rows } = await query(
    `SELECT id, status, station_id FROM deliveries
      WHERE id = $1
        AND ($2::INT IS NULL OR distributor_id = $2)`,
    [deliveryId, distributorId]
  );
  if (!rows[0]) throw new ApiError(404, "Delivery not found.");

  const now = new Date();
  const patch = {
    in_transit: `departed_at = $2`,
    completed:  `arrived_at = $2`,
    cancelled:  `arrived_at = NULL`,
  };

  await query(
    `UPDATE deliveries SET status = $1, ${patch[status]} WHERE id = $3`,
    [status, now, deliveryId]
  );

  return { ok: true, status };
}

export async function reconcileDelivery(userId, deliveryId, itemReconciliations) {
  // itemReconciliations: [{ fuelCode, receivedQuantity }]
  const { pool } = await import("../../db/pool.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const distributorId = await getDistributorId(userId);

    const { rows: delRows } = await client.query(
      `SELECT d.id, d.station_id, d.status
         FROM deliveries d
        WHERE d.id = $1
          AND ($2::INT IS NULL OR d.distributor_id = $2)`,
      [deliveryId, distributorId]
    );
    if (!delRows[0]) throw new ApiError(404, "Delivery not found.");
    if (delRows[0].status === "cancelled") {
      throw new ApiError(400, "Cannot reconcile a cancelled delivery.");
    }

    const stationId = delRows[0].station_id;

    for (const rec of itemReconciliations) {
      const { rows: ftRows } = await client.query(
        `SELECT id FROM fuel_types WHERE code = $1`,
        [rec.fuelCode.toUpperCase()]
      );
      if (!ftRows[0]) continue;
      const fuelTypeId = ftRows[0].id;

      const { rows: itemRows } = await client.query(
        `SELECT id, expected_quantity FROM delivery_items
          WHERE delivery_id = $1 AND fuel_type_id = $2`,
        [deliveryId, fuelTypeId]
      );
      if (!itemRows[0]) continue;

      const expected = parseFloat(itemRows[0].expected_quantity);
      const received = parseFloat(rec.receivedQuantity);
      const itemStatus = Math.abs(received - expected) / expected > 0.01
        ? "discrepancy"
        : "received";

      // Update delivery item
      await client.query(
        `UPDATE delivery_items
            SET received_quantity = $1, status = $2
          WHERE id = $3`,
        [received, itemStatus, itemRows[0].id]
      );

      // Update station inventory
      await client.query(
        `UPDATE inventory
            SET quantity = quantity + $1, updated_at = NOW()
          WHERE station_id = $2 AND fuel_type_id = $3`,
        [received, stationId, fuelTypeId]
      );

      // Log inventory movement
      const { rows: invRows } = await client.query(
        `SELECT quantity FROM inventory WHERE station_id = $1 AND fuel_type_id = $2`,
        [stationId, fuelTypeId]
      );
      await client.query(
        `INSERT INTO inventory_movements
           (station_id, fuel_type_id, movement_type, quantity,
            balance_after, reason, ref_type, ref_id, created_by)
         VALUES ($1,$2,'receiving',$3,$4,
                 'Delivery received','delivery',$5,$6)`,
        [stationId, fuelTypeId, received,
         invRows[0]?.quantity ?? received,
         deliveryId, userId]
      );
    }

    // Mark delivery completed if not already
    await client.query(
      `UPDATE deliveries SET status = 'completed', arrived_at = NOW()
        WHERE id = $1 AND status != 'completed'`,
      [deliveryId]
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ── supply requests ────────────────────────────────────────────────────────

export async function getSupplyRequests(userId) {
  const distributorId = await getDistributorId(userId);

  const { rows } = await query(
    `SELECT
       sr.id, sr.status, sr.quantity, sr.created_at,
       s.name AS station_name, s.region AS station_region,
       ft.name AS fuel_name, ft.code AS fuel_code,
       dist.id AS distributor_id
     FROM supply_requests sr
     JOIN stations s      ON s.id = sr.station_id
     JOIN fuel_types ft   ON ft.id = sr.fuel_type_id
     JOIN distributors dist ON dist.id = sr.distributor_id
     WHERE ($1::INT IS NULL OR sr.distributor_id = $1)
     ORDER BY sr.created_at DESC`,
    [distributorId]
  );
  return rows;
}

export async function updateSupplyRequestStatus(userId, requestId, status) {
  const allowed = ["approved", "rejected", "fulfilled"];
  if (!allowed.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${allowed.join(", ")}`);
  }
  const distributorId = await getDistributorId(userId);

  const { rows } = await query(
    `UPDATE supply_requests SET status = $1
      WHERE id = $2
        AND ($3::INT IS NULL OR distributor_id = $3)
      RETURNING id, status`,
    [status, requestId, distributorId]
  );
  if (!rows[0]) throw new ApiError(404, "Supply request not found.");
  return rows[0];
}

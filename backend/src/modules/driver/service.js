import { query } from "../../db/pool.js";
import { ApiError } from "../../middleware/error.js";

// ── helpers ────────────────────────────────────────────────────────────────

function riskLevel(qty, low, critical) {
  if (qty <= critical) return "CRITICAL";
  if (qty <= low)      return "HIGH";
  return "LOW";
}

function generateCode() {
  return "SF" + Math.floor(1000 + Math.random() * 9000).toString();
}

// ── public station discovery ───────────────────────────────────────────────

export async function findStations({ fuelCode, lat, lng } = {}) {
  // Join stations with their inventory. For drivers we only surface what
  // they need: availability, queue depth, last-updated time.
  const { rows } = await query(
    `SELECT
       s.id, s.name, s.region, s.city, s.address,
       s.lat, s.lng,
       i.quantity, i.capacity, i.threshold_low, i.threshold_critical,
       i.updated_at,
       ft.code AS fuel_code, ft.name AS fuel_name,
       ( SELECT COUNT(*) FROM queue_entries qe
         WHERE qe.station_id = s.id AND qe.status = 'waiting' ) AS queue_count,
       ( SELECT COUNT(*) FROM reservations r
         WHERE r.station_id = s.id AND r.status = 'active' ) AS active_reservations
     FROM stations s
     JOIN inventory i ON i.station_id = s.id
     JOIN fuel_types ft ON ft.id = i.fuel_type_id
     WHERE s.status = 'active'
       AND ($1::TEXT IS NULL OR ft.code = $1)
     ORDER BY s.name, ft.code`,
    [fuelCode?.toUpperCase() ?? null]
  );

  // Group by station
  const stationMap = new Map();
  for (const row of rows) {
    if (!stationMap.has(row.id)) {
      stationMap.set(row.id, {
        id: row.id,
        name: row.name,
        region: row.region,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        fuels: {},
        queueCount: parseInt(row.queue_count),
        activeReservations: parseInt(row.active_reservations),
        lastUpdated: row.updated_at,
      });
    }
    const st = stationMap.get(row.id);
    const risk = riskLevel(row.quantity, row.threshold_low, row.threshold_critical);
    st.fuels[row.fuel_code.toLowerCase()] = {
      fuelCode: row.fuel_code,
      fuelName: row.fuel_name,
      quantity: parseFloat(row.quantity),
      capacity: parseFloat(row.capacity),
      riskLevel: risk,
      percentFull: Math.round((row.quantity / row.capacity) * 100),
    };
    // Station-level risk = worst fuel risk
    const rankMap = { LOW: 0, HIGH: 1, CRITICAL: 2 };
    const current = st.riskLevel ? rankMap[st.riskLevel] : -1;
    if ((rankMap[risk] ?? 0) > current) st.riskLevel = risk;
    // Keep newest updatedAt
    if (new Date(row.updated_at) > new Date(st.lastUpdated)) {
      st.lastUpdated = row.updated_at;
    }
  }

  return Array.from(stationMap.values());
}

// ── reservation ────────────────────────────────────────────────────────────

export async function createReservation(userId, {
  stationId, fuelCode, amountL, plateNumber, vehicleType,
}) {
  const client = await query._pool ? null : null; // use pool directly
  // Use a transaction so inventory + reservation are atomic.
  const { pool } = await import("../../db/pool.js");
  const client2 = await pool.connect();

  try {
    await client2.query("BEGIN");

    // Resolve fuel type
    const { rows: ftRows } = await client2.query(
      `SELECT id FROM fuel_types WHERE code = $1`,
      [fuelCode.toUpperCase()]
    );
    if (!ftRows[0]) throw new ApiError(400, "Unknown fuel type.");
    const fuelTypeId = ftRows[0].id;

    // Check station exists
    const { rows: stRows } = await client2.query(
      `SELECT id FROM stations WHERE id = $1 AND status = 'active'`,
      [stationId]
    );
    if (!stRows[0]) throw new ApiError(404, "Station not found.");

    // Check inventory
    const { rows: invRows } = await client2.query(
      `SELECT quantity, threshold_critical FROM inventory
        WHERE station_id = $1 AND fuel_type_id = $2
        FOR UPDATE`,
      [stationId, fuelTypeId]
    );
    const inv = invRows[0];
    if (!inv) throw new ApiError(404, "Fuel type not available at this station.");
    if (parseFloat(inv.quantity) < amountL) {
      throw new ApiError(409, "Not enough stock available for this reservation.");
    }

    // One active reservation per user (relaxed for the MVP)
    const { rows: existingRes } = await client2.query(
      `SELECT id FROM reservations
        WHERE user_id = $1 AND status = 'active'
        LIMIT 1`,
      [userId]
    );
    if (existingRes.length > 0) {
      throw new ApiError(409, "You already have an active reservation. Cancel it first.");
    }

    // Resolve or create vehicle
    let vehicleId = null;
    if (plateNumber) {
      const { rows: vehRows } = await client2.query(
        `SELECT id FROM vehicles WHERE user_id = $1 AND plate_number = $2`,
        [userId, plateNumber]
      );
      if (vehRows[0]) {
        vehicleId = vehRows[0].id;
      } else {
        const { rows: newVeh } = await client2.query(
          `INSERT INTO vehicles (user_id, plate_number, vehicle_type, fuel_type_id)
           SELECT $1, $2, $3, id FROM fuel_types WHERE code = $4
           RETURNING id`,
          [userId, plateNumber, vehicleType || "Car", fuelCode.toUpperCase()]
        );
        vehicleId = newVeh[0].id;
      }
    }

    // Next queue number for this station
    const { rows: qRows } = await client2.query(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next
         FROM reservations WHERE station_id = $1`,
      [stationId]
    );
    const queueNumber = qRows[0].next;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // Create reservation
    const { rows: resRows } = await client2.query(
      `INSERT INTO reservations
         (station_id, user_id, vehicle_id, fuel_type_id,
          amount_l, status, queue_number, code, expires_at)
       VALUES ($1,$2,$3,$4,$5,'active',$6,$7,$8)
       RETURNING *`,
      [stationId, userId, vehicleId, fuelTypeId, amountL, queueNumber, code, expiresAt]
    );
    const reservation = resRows[0];

    // Add to queue
    const { rows: qPos } = await client2.query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next
         FROM queue_entries WHERE station_id = $1 AND status = 'waiting'`,
      [stationId]
    );
    await client2.query(
      `INSERT INTO queue_entries (station_id, reservation_id, position)
       VALUES ($1, $2, $3)`,
      [stationId, reservation.id, qPos[0].next]
    );

    // Hold inventory (soft deduction — we track the hold)
    const holdQty  = -parseFloat(amountL);
    const balAfter = parseFloat(inv.quantity) - parseFloat(amountL);
    await client2.query(
      `INSERT INTO inventory_movements
         (station_id, fuel_type_id, movement_type, quantity,
          balance_after, reason, ref_type, ref_id)
       VALUES ($1, $2, 'reservation_hold', $3, $4,
               $5, 'reservation', $6)`,
      [stationId, fuelTypeId, holdQty, balAfter, `Reservation ${code}`, reservation.id]
    );

    // Reduce inventory
    await client2.query(
      `UPDATE inventory
          SET quantity = quantity - $1, updated_at = NOW()
        WHERE station_id = $2 AND fuel_type_id = $3`,
      [amountL, stationId, fuelTypeId]
    );

    await client2.query("COMMIT");

    // Return enriched reservation
    const { rows: enriched } = await client2.query(
      `SELECT r.id, r.queue_number, r.code, r.amount_l,
              r.status, r.expires_at, r.created_at,
              ft.name AS fuel_name,
              s.name AS station_name, s.address AS station_address
         FROM reservations r
         JOIN fuel_types ft ON ft.id = r.fuel_type_id
         JOIN stations s ON s.id = r.station_id
        WHERE r.id = $1`,
      [reservation.id]
    );
    return enriched[0];
  } catch (err) {
    await client2.query("ROLLBACK");
    throw err;
  } finally {
    client2.release();
  }
}

export async function cancelReservation(userId, reservationId) {
  const { pool } = await import("../../db/pool.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT r.*, ft.id AS fuel_type_id
         FROM reservations r
         JOIN fuel_types ft ON ft.id = r.fuel_type_id
        WHERE r.id = $1 AND r.user_id = $2 AND r.status = 'active'`,
      [reservationId, userId]
    );
    if (!rows[0]) throw new ApiError(404, "Active reservation not found.");
    const res = rows[0];

    // Cancel reservation
    await client.query(
      `UPDATE reservations SET status = 'cancelled', completed_at = NOW()
        WHERE id = $1`,
      [reservationId]
    );

    // Remove from queue
    await client.query(
      `UPDATE queue_entries SET status = 'skipped'
        WHERE reservation_id = $1`,
      [reservationId]
    );

    // Release inventory
    await client.query(
      `UPDATE inventory
          SET quantity = quantity + $1, updated_at = NOW()
        WHERE station_id = $2 AND fuel_type_id = $3`,
      [res.amount_l, res.station_id, res.fuel_type_id]
    );

    // Log movement
    const { rows: invAfter } = await client.query(
      `SELECT quantity FROM inventory WHERE station_id = $1 AND fuel_type_id = $2`,
      [res.station_id, res.fuel_type_id]
    );
    await client.query(
      `INSERT INTO inventory_movements
         (station_id, fuel_type_id, movement_type, quantity,
          balance_after, reason, ref_type, ref_id)
       VALUES ($1, $2, 'reservation_release', $3, $4,
               'Reservation cancelled', 'reservation', $5)`,
      [res.station_id, res.fuel_type_id, res.amount_l, parseFloat(invAfter[0].quantity), reservationId]
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

// ── driver's own reservations & queue ─────────────────────────────────────

export async function getMyReservations(userId) {
  const { rows } = await query(
    `SELECT r.id, r.queue_number, r.code, r.amount_l,
            r.status, r.expires_at, r.created_at,
            ft.name AS fuel_name,
            s.name AS station_name, s.address AS station_address,
            qe.position AS queue_position
       FROM reservations r
       JOIN fuel_types ft ON ft.id = r.fuel_type_id
       JOIN stations s ON s.id = r.station_id
  LEFT JOIN queue_entries qe ON qe.reservation_id = r.id AND qe.status = 'waiting'
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 20`,
    [userId]
  );
  return rows;
}

export async function getMyQueue(userId) {
  const { rows } = await query(
    `SELECT r.id, r.queue_number, r.code, r.amount_l,
            r.status, r.expires_at,
            ft.name AS fuel_name,
            s.name AS station_name, s.address AS station_address,
            qe.position AS queue_position,
            ( SELECT COUNT(*) FROM queue_entries qe2
              WHERE qe2.station_id = r.station_id
                AND qe2.status = 'waiting'
                AND qe2.position < qe.position
            ) AS ahead_count
       FROM reservations r
       JOIN fuel_types ft ON ft.id = r.fuel_type_id
       JOIN stations s ON s.id = r.station_id
  LEFT JOIN queue_entries qe ON qe.reservation_id = r.id AND qe.status = 'waiting'
      WHERE r.user_id = $1 AND r.status = 'active'
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

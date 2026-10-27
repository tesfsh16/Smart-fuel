import { query } from "../../db/pool.js";
import { ApiError } from "../../middleware/error.js";

// ── helpers ────────────────────────────────────────────────────────────────

function riskLevel(qty, low, critical) {
  const q = parseFloat(qty);
  const l = parseFloat(low);
  const c = parseFloat(critical);
  if (q <= c) return "CRITICAL";
  if (q <= l) return "HIGH";
  return "LOW";
}

// ── station ────────────────────────────────────────────────────────────────

export async function getStation(stationId) {
  const { rows } = await query(
    `SELECT id, name, region, city, address, lat, lng, status
       FROM stations WHERE id = $1`,
    [stationId]
  );
  if (!rows[0]) throw new ApiError(404, "Station not found.");
  return rows[0];
}

// ── dashboard ──────────────────────────────────────────────────────────────

export async function getDashboard(stationId) {
  const station = await getStation(stationId);

  // Inventory
  const { rows: inv } = await query(
    `SELECT i.quantity, i.capacity, i.threshold_low, i.threshold_critical,
            ft.code AS fuel_code, ft.name AS fuel_name
       FROM inventory i
       JOIN fuel_types ft ON ft.id = i.fuel_type_id
      WHERE i.station_id = $1`,
    [stationId]
  );

  const inventory = {};
  for (const row of inv) {
    inventory[row.fuel_code.toLowerCase()] = {
      quantity: parseFloat(row.quantity),
      capacity: parseFloat(row.capacity),
      thresholdLow: parseFloat(row.threshold_low),
      thresholdCritical: parseFloat(row.threshold_critical),
      riskLevel: riskLevel(row.quantity, row.threshold_low, row.threshold_critical),
    };
  }

  // Today's sales
  const { rows: sales } = await query(
    `SELECT COALESCE(SUM(quantity_l), 0) AS total
       FROM transactions
      WHERE station_id = $1
        AND created_at >= CURRENT_DATE`,
    [stationId]
  );

  // Active reservations count
  const { rows: resCount } = await query(
    `SELECT COUNT(*) AS total
       FROM reservations
      WHERE station_id = $1 AND status = 'active'`,
    [stationId]
  );

  // Queue count
  const { rows: queueCount } = await query(
    `SELECT COUNT(*) AS total
       FROM queue_entries
      WHERE station_id = $1 AND status = 'waiting'`,
    [stationId]
  );

  // Average wait (rough: 5 min per vehicle in queue)
  const waitMin = parseInt(queueCount[0].total) * 5;

  // Next delivery
  const { rows: nextDel } = await query(
    `SELECT d.id, d.status, d.scheduled_at,
            ft.name AS fuel_name,
            di.expected_quantity
       FROM deliveries d
       JOIN delivery_items di ON di.delivery_id = d.id
       JOIN fuel_types ft ON ft.id = di.fuel_type_id
      WHERE d.station_id = $1
        AND d.status IN ('scheduled','in_transit')
      ORDER BY d.scheduled_at ASC
      LIMIT 1`,
    [stationId]
  );

  // Alerts
  const alerts = [];
  for (const [code, data] of Object.entries(inventory)) {
    if (data.riskLevel === "CRITICAL") {
      alerts.push({ type: "critical", message: `${code.charAt(0).toUpperCase() + code.slice(1)} stock is critical (${data.quantity.toLocaleString()} L remaining)` });
    } else if (data.riskLevel === "HIGH") {
      alerts.push({ type: "warning", message: `${code.charAt(0).toUpperCase() + code.slice(1)} stock is below normal threshold` });
    }
  }

  return {
    station: {
      id: station.id,
      name: station.name,
      region: station.region,
      address: station.address,
    },
    inventory,
    todaysSalesL: parseFloat(sales[0].total),
    activeReservations: parseInt(resCount[0].total),
    queueCount: parseInt(queueCount[0].total),
    estimatedWaitMin: waitMin,
    nextDelivery: nextDel[0] ? {
      fuelName: nextDel[0].fuel_name,
      expectedQuantity: parseFloat(nextDel[0].expected_quantity),
      status: nextDel[0].status,
      scheduledAt: nextDel[0].scheduled_at,
    } : null,
    alerts,
  };
}

// ── inventory ──────────────────────────────────────────────────────────────

export async function getInventory(stationId) {
  const { rows } = await query(
    `SELECT i.id, i.quantity, i.capacity,
            i.threshold_low, i.threshold_critical,
            i.updated_at,
            ft.id AS fuel_type_id, ft.code AS fuel_code, ft.name AS fuel_name
       FROM inventory i
       JOIN fuel_types ft ON ft.id = i.fuel_type_id
      WHERE i.station_id = $1
      ORDER BY ft.name`,
    [stationId]
  );
  return rows.map(r => ({
    id: r.id,
    fuelCode: r.fuel_code,
    fuelName: r.fuel_name,
    quantity: parseFloat(r.quantity),
    capacity: parseFloat(r.capacity),
    thresholdLow: parseFloat(r.threshold_low),
    thresholdCritical: parseFloat(r.threshold_critical),
    percentFull: Math.round((r.quantity / r.capacity) * 100),
    riskLevel: riskLevel(r.quantity, r.threshold_low, r.threshold_critical),
    updatedAt: r.updated_at,
  }));
}

export async function getInventoryMovements(stationId, limit = 50) {
  const { rows } = await query(
    `SELECT im.id, im.movement_type, im.quantity, im.balance_after,
            im.reason, im.ref_type, im.created_at,
            ft.name AS fuel_name,
            u.full_name AS created_by
       FROM inventory_movements im
       JOIN fuel_types ft ON ft.id = im.fuel_type_id
  LEFT JOIN users u ON u.id = im.created_by
      WHERE im.station_id = $1
      ORDER BY im.created_at DESC
      LIMIT $2`,
    [stationId, limit]
  );
  return rows;
}

// ── reservations ───────────────────────────────────────────────────────────

export async function getReservations(stationId, status = "active") {
  const { rows } = await query(
    `SELECT r.id, r.queue_number, r.code, r.amount_l,
            r.status, r.expires_at, r.created_at,
            ft.name AS fuel_name,
            u.full_name AS driver_name,
            v.plate_number
       FROM reservations r
       JOIN fuel_types ft ON ft.id = r.fuel_type_id
       JOIN users u ON u.id = r.user_id
  LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE r.station_id = $1
        AND r.status = $2
      ORDER BY r.queue_number ASC`,
    [stationId, status]
  );
  return rows;
}

// ── queue ──────────────────────────────────────────────────────────────────

export async function getQueue(stationId) {
  const { rows } = await query(
    `SELECT qe.id, qe.position, qe.status, qe.joined_at,
            r.id AS reservation_id,
            r.queue_number, r.code, r.amount_l,
            ft.name AS fuel_name,
            u.full_name AS driver_name,
            v.plate_number
       FROM queue_entries qe
       JOIN reservations r ON r.id = qe.reservation_id
       JOIN fuel_types ft ON ft.id = r.fuel_type_id
       JOIN users u ON u.id = r.user_id
  LEFT JOIN vehicles v ON v.id = r.vehicle_id
      WHERE qe.station_id = $1 AND qe.status = 'waiting'
      ORDER BY qe.position ASC`,
    [stationId]
  );
  return rows;
}

// ── deliveries ─────────────────────────────────────────────────────────────

export async function getDeliveries(stationId) {
  const { rows } = await query(
    `SELECT d.id, d.status, d.scheduled_at, d.departed_at, d.arrived_at,
            org.name AS distributor_name,
            di.fuel_type_id,
            ft.name AS fuel_name,
            di.expected_quantity, di.received_quantity, di.status AS item_status
       FROM deliveries d
       JOIN distributors dist ON dist.id = d.distributor_id
       JOIN organizations org ON org.id = dist.organization_id
       JOIN delivery_items di ON di.delivery_id = d.id
       JOIN fuel_types ft ON ft.id = di.fuel_type_id
      WHERE d.station_id = $1
      ORDER BY d.scheduled_at DESC`,
    [stationId]
  );
  return rows;
}

// ── confirm fuel dispensed ─────────────────────────────────────────────────
// Called by a station manager when the driver physically receives fuel.
// 1. Marks the reservation as completed
// 2. Marks the queue entry as served
// 3. Records a transaction
// 4. Deducts the fuel amount from inventory (it was held on reservation)
//    — the reservation_hold already deducted, so we only log the sale movement

export async function confirmFuelled(stationId, reservationId, staffUserId) {
  const { pool } = await import("../../db/pool.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Load reservation and validate it belongs to this station
    const { rows: resRows } = await client.query(
      `SELECT r.*, ft.id AS fuel_type_id
         FROM reservations r
         JOIN fuel_types ft ON ft.id = r.fuel_type_id
        WHERE r.id = $1
          AND r.station_id = $2
          AND r.status = 'active'`,
      [reservationId, stationId]
    );
    if (!resRows[0]) throw new ApiError(404, "Active reservation not found.");
    const res = resRows[0];

    // 2. Mark reservation completed
    await client.query(
      `UPDATE reservations
          SET status = 'completed', completed_at = NOW()
        WHERE id = $1`,
      [reservationId]
    );

    // 3. Mark queue entry as served
    await client.query(
      `UPDATE queue_entries SET status = 'served', served_at = NOW()
        WHERE reservation_id = $1`,
      [reservationId]
    );

    // 4. Record the transaction (actual fuel dispensed)
    await client.query(
      `INSERT INTO transactions
         (station_id, reservation_id, user_id, vehicle_id, fuel_type_id, quantity_l)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [stationId, reservationId, res.user_id, res.vehicle_id, res.fuel_type_id, res.amount_l]
    );

    // 5. Log inventory movement (sale — the hold already reduced inventory,
    //    now we convert it from hold to confirmed sale)
    const { rows: invRows } = await client.query(
      `SELECT quantity FROM inventory
        WHERE station_id = $1 AND fuel_type_id = $2`,
      [stationId, res.fuel_type_id]
    );
    await client.query(
      `INSERT INTO inventory_movements
         (station_id, fuel_type_id, movement_type, quantity,
          balance_after, reason, ref_type, ref_id, created_by)
       VALUES ($1,$2,'sale',$3,$4,'Fuel dispensed','reservation',$5,$6)`,
      [
        stationId, res.fuel_type_id,
        -parseFloat(res.amount_l),
        invRows[0]?.quantity ?? 0,
        reservationId, staffUserId,
      ]
    );

    await client.query("COMMIT");
    return { ok: true, reservationId, amountL: parseFloat(res.amount_l) };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

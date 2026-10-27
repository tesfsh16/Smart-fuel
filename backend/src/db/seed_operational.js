/**
 * Seed operational data: inventory, movements, reservations, queue,
 * transactions, deliveries.  Matches the prototype's demo scenario
 * (Monday morning, Bole Station A has unusual +40% diesel demand).
 *
 * Run: npm run seed:ops
 */
import { pool } from "./pool.js";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── look-ups ──────────────────────────────────────────────────────
    const { rows: stRows } = await client.query(
      `SELECT id, name FROM stations ORDER BY id`
    );
    const { rows: ftRows } = await client.query(
      `SELECT id, code FROM fuel_types`
    );
    const { rows: distRows } = await client.query(
      `SELECT id FROM distributors LIMIT 1`
    );
    const { rows: userRows } = await client.query(
      `SELECT id FROM users WHERE email = 'driver@demo.com' LIMIT 1`
    );
    const { rows: managerRows } = await client.query(
      `SELECT id FROM users WHERE email = 'manager@demo.com' LIMIT 1`
    );

    const sta = {}; stRows.forEach(r => { sta[r.name] = r.id; });
    const ft  = {}; ftRows.forEach(r => { ft[r.code] = r.id; });
    const distId    = distRows[0].id;
    const driverId  = userRows[0].id;
    const managerId = managerRows[0].id;

    const s1 = stRows[0].id;   // Bole Station A
    const s2 = stRows[1].id;   // Kazanchis Station B
    const s3 = stRows[2].id;   // Megenagna Station C
    const petrol = ft["PETROL"];
    const diesel  = ft["DIESEL"];

    // ── inventory ────────────────────────────────────────────────────
    const inv = [
      // [station_id, fuel_type_id, qty, cap, thr_low, thr_critical]
      [s1, petrol,  4820, 20000, 3000, 1000],
      [s1, diesel,  8400, 20000, 3000, 1000],
      [s2, petrol, 12600, 20000, 3000, 1000],
      [s2, diesel, 15200, 20000, 3000, 1000],
      [s3, petrol,  1900, 20000, 3000, 1000],
      [s3, diesel,  2100, 20000, 3000, 1000],
    ];

    for (const [sid, fid, qty, cap, lo, crit] of inv) {
      await client.query(
        `INSERT INTO inventory
           (station_id, fuel_type_id, quantity, capacity,
            threshold_low, threshold_critical)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sid, fid, qty, cap, lo, crit]
      );
    }

    // ── vehicles ─────────────────────────────────────────────────────
    const { rows: veh } = await client.query(
      `INSERT INTO vehicles (user_id, plate_number, vehicle_type, fuel_type_id)
       VALUES ($1, '3-12345 A.A', 'Sedan', $2) RETURNING id`,
      [driverId, petrol]
    );
    const vehicleId = veh[0].id;

    // ── reservations (station A) ──────────────────────────────────────
    const resCodes = ["SF4821","SF4822","SF4823","SF4824"];
    const resData = [
      [s1, driverId,  vehicleId, petrol, 20, "active",    47, resCodes[0], 30],
      [s1, managerId, null,      diesel, 30, "active",    48, resCodes[1], 45],
      [s1, managerId, null,      diesel, 25, "completed", 49, resCodes[2], -60],
      [s2, driverId,  vehicleId, petrol, 15, "active",    12, resCodes[3], 20],
    ];
    const resIds = [];
    for (const [sid, uid, vid, fid, amt, st, qno, code, minOffset] of resData) {
      const expiresAt = new Date(Date.now() + minOffset * 60 * 1000);
      const { rows: r } = await client.query(
        `INSERT INTO reservations
           (station_id, user_id, vehicle_id, fuel_type_id,
            amount_l, status, queue_number, code, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [sid, uid, vid, fid, amt, st, qno, code, expiresAt]
      );
      resIds.push(r[0].id);
    }

    // ── queue entries (active reservations only) ──────────────────────
    await client.query(
      `INSERT INTO queue_entries (station_id, reservation_id, position)
       VALUES ($1,$2,1), ($1,$3,2), ($4,$5,1)`,
      [s1, resIds[0], resIds[1], s2, resIds[3]]
    );

    // ── transactions (yesterday + today) ─────────────────────────────
    // Station A — diesel spike today (+40 % above normal)
    // Normal ~6 200 L/day diesel; today already ~4 200 L by morning
    const txRows = [
      // [station_id, res_id, user_id, vehicle_id, fuel_type_id, qty, hoursAgo]
      [s1, null, managerId, null, diesel,  200, 8],
      [s1, null, managerId, null, diesel,  350, 7],
      [s1, null, managerId, null, diesel,  420, 6],
      [s1, null, managerId, null, diesel,  510, 5],
      [s1, null, managerId, null, diesel,  380, 4],
      [s1, null, managerId, null, diesel,  490, 3],
      [s1, null, managerId, null, diesel,  610, 2],
      [s1, null, managerId, null, diesel,  520, 1],  // total ~3 480 L this morning
      [s1, resIds[2], driverId, vehicleId, petrol, 25, 2],
      [s2, null, managerId, null, petrol,  300, 5],
      [s2, null, managerId, null, diesel,  280, 3],
      [s3, null, managerId, null, petrol,  450, 6],
      [s3, null, managerId, null, petrol,  520, 4],
    ];

    for (const [sid, rid, uid, vid, fid, qty, hAgo] of txRows) {
      const ts = new Date(Date.now() - hAgo * 3_600_000);
      await client.query(
        `INSERT INTO transactions
           (station_id, reservation_id, user_id, vehicle_id,
            fuel_type_id, quantity_l, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [sid, rid, uid, vid, fid, qty, ts]
      );
    }

    // ── deliveries ────────────────────────────────────────────────────
    const tomorrow = new Date(Date.now() + 86_400_000);
    const today18  = new Date(); today18.setHours(18, 0, 0, 0);
    const yesterday = new Date(Date.now() - 86_400_000);

    const delData = [
      // [distributor, station, status, scheduled_at]
      [distId, s1, "scheduled",  tomorrow],
      [distId, s3, "in_transit", today18],
      [distId, s2, "completed",  yesterday],
    ];
    const delIds = [];
    for (const [did, sid, st, sched] of delData) {
      const { rows: d } = await client.query(
        `INSERT INTO deliveries
           (distributor_id, station_id, status, scheduled_at, created_by)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [did, sid, st, sched, managerId]
      );
      delIds.push(d[0].id);
    }

    // Delivery items
    // DEL 1: 10 000 L diesel scheduled to S1
    await client.query(
      `INSERT INTO delivery_items
         (delivery_id, fuel_type_id, expected_quantity)
       VALUES ($1,$2,$3)`,
      [delIds[0], diesel, 10000]
    );
    // DEL 2: 15 000 L petrol in-transit to S3
    await client.query(
      `INSERT INTO delivery_items
         (delivery_id, fuel_type_id, expected_quantity)
       VALUES ($1,$2,$3)`,
      [delIds[1], petrol, 15000]
    );
    // DEL 3: 20 000 L diesel completed to S2 — discrepancy
    await client.query(
      `INSERT INTO delivery_items
         (delivery_id, fuel_type_id, expected_quantity, received_quantity, status)
       VALUES ($1,$2,$3,$4,'discrepancy')`,
      [delIds[2], diesel, 20000, 18400]
    );

    // ── inventory movements for the completed delivery ────────────────
    await client.query(
      `INSERT INTO inventory_movements
         (station_id, fuel_type_id, movement_type, quantity,
          balance_after, reason, ref_type, ref_id, created_by)
       VALUES ($1,$2,'receiving',$3,$4,'Delivery received',
               'delivery',$5,$6)`,
      [s2, diesel, 18400, 15200, delIds[2], managerId]
    );

    await client.query("COMMIT");
    console.log("✓ Operational seed data inserted.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error("Operational seed failed:", err.message);
  process.exit(1);
});

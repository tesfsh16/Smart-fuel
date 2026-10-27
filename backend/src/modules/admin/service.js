import { query } from "../../db/pool.js";

export async function getAdminStats() {
  // User registration stats
  const { rows: userRows } = await query(
    `SELECT
       COUNT(*) AS total_users,
       COUNT(*) FILTER (WHERE status = 'active')    AS active_users,
       COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_users
     FROM users`
  );

  // Driver registrations (users with DRIVER role)
  const { rows: driverRows } = await query(
    `SELECT COUNT(DISTINCT ur.user_id) AS total_drivers
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE r.name = 'DRIVER'`
  );

  // Registration attempts — approximate from audit_logs if entries exist,
  // otherwise use created_at on users as a proxy
  const { rows: recentUsers } = await query(
    `SELECT id, full_name, email, status, created_at
       FROM users
      ORDER BY created_at DESC
      LIMIT 10`
  );

  // Reservation stats
  const { rows: resRows } = await query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'active')    AS active,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
       COUNT(*) FILTER (WHERE status = 'expired')   AS expired,
       COUNT(*) FILTER (WHERE status = 'no_show')   AS no_show
     FROM reservations`
  );

  // Today's activity
  const { rows: todayRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS users_today,
       COUNT(*) FILTER (
         WHERE created_at >= CURRENT_DATE
           AND status = 'active'
       ) AS active_today
     FROM users`
  );

  const { rows: resTodayRows } = await query(
    `SELECT COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS reservations_today
       FROM reservations`
  );

  // Active sessions proxy — non-revoked refresh tokens
  const { rows: sessRows } = await query(
    `SELECT COUNT(DISTINCT user_id) AS active_sessions
       FROM refresh_tokens
      WHERE revoked_at IS NULL AND expires_at > NOW()`
  );

  // Per-role user count
  const { rows: roleRows } = await query(
    `SELECT r.name AS role, COUNT(ur.user_id) AS count
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      GROUP BY r.name
      ORDER BY count DESC`
  );

  return {
    users: {
      total:       parseInt(userRows[0].total_users),
      active:      parseInt(userRows[0].active_users),
      suspended:   parseInt(userRows[0].suspended_users),
      drivers:     parseInt(driverRows[0].total_drivers),
      today:       parseInt(todayRows[0].users_today),
      activeSessions: parseInt(sessRows[0].active_sessions),
    },
    reservations: {
      total:     parseInt(resRows[0].total),
      active:    parseInt(resRows[0].active),
      completed: parseInt(resRows[0].completed),
      cancelled: parseInt(resRows[0].cancelled),
      expired:   parseInt(resRows[0].expired),
      noShow:    parseInt(resRows[0].no_show),
      today:     parseInt(resTodayRows[0].reservations_today),
    },
    roleBreakdown: roleRows.map(r => ({
      role:  r.role,
      count: parseInt(r.count),
    })),
    recentUsers: recentUsers.map(u => ({
      id:        u.id,
      fullName:  u.full_name,
      email:     u.email,
      status:    u.status,
      createdAt: u.created_at,
    })),
  };
}

// ── user management ────────────────────────────────────────────────────────

export async function listUsers() {
  const { rows } = await query(
    `SELECT u.id, u.email, u.full_name, u.status, u.created_at,
            json_agg(
              json_build_object('role', r.name, 'scopeType', ur.scope_type, 'scopeId', ur.scope_id)
              ORDER BY r.name
            ) AS roles
       FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
      GROUP BY u.id
      ORDER BY u.created_at DESC`
  );
  return rows.map(u => ({
    id:        u.id,
    email:     u.email,
    fullName:  u.full_name,
    status:    u.status,
    createdAt: u.created_at,
    roles:     u.roles?.filter(r => r.role) || [],
  }));
}

export async function toggleUserStatus(userId, status) {
  const { rows } = await query(
    `UPDATE users SET status = $1 WHERE id = $2
     RETURNING id, email, full_name, status`,
    [status, userId]
  );
  if (!rows[0]) throw new Error("User not found.");
  return { id: rows[0].id, email: rows[0].email, status: rows[0].status };
}

// ── entity registration ────────────────────────────────────────────────────

export async function createEntity(data) {
  const { pool } = await import("../../db/pool.js");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const bcrypt = (await import("bcrypt")).default;

    if (data.type === "station") {
      // 1. Ensure a station_company organization exists (or create one)
      let orgId;
      const { rows: orgRows } = await client.query(
        `SELECT id FROM organizations WHERE type = 'station_company' LIMIT 1`
      );
      if (orgRows[0]) {
        orgId = orgRows[0].id;
      } else {
        const { rows: newOrg } = await client.query(
          `INSERT INTO organizations (name, type) VALUES ('Station Companies', 'station_company') RETURNING id`
        );
        orgId = newOrg[0].id;
      }

      // 2. Create station
      const { rows: stRows } = await client.query(
        `INSERT INTO stations (organization_id, name, region, city, address, lat, lng)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [orgId, data.name, data.region, data.city||null, data.address||null, data.lat||null, data.lng||null]
      );
      const stationId = stRows[0].id;

      const { rows: ftRows } = await client.query(`SELECT id, code FROM fuel_types`);
      // 3. Create inventory rows with initial stock
      for (const ft of ftRows) {
        const initial = ft.code === "PETROL"
          ? (data.initialPetrol ?? 0)
          : ft.code === "DIESEL"
            ? (data.initialDiesel ?? 0)
            : 0;
        await client.query(
          `INSERT INTO inventory (station_id, fuel_type_id, quantity, capacity, threshold_low, threshold_critical)
           VALUES ($1,$2,$3,20000,3000,1000)`,
          [stationId, ft.id, initial]
        );
      }

      // 4. Create manager account
      const hash = await bcrypt.hash(data.managerPassword, 10);
      const { rows: uRows } = await client.query(
        `INSERT INTO users (email, full_name, password_hash) VALUES ($1,$2,$3) RETURNING id`,
        [data.managerEmail, data.managerName, hash]
      );
      const userId = uRows[0].id;

      await client.query(
        `INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
         SELECT $1, id, 'station', $2 FROM roles WHERE name = 'STATION_MANAGER'`,
        [userId, stationId]
      );
      await client.query(
        `INSERT INTO station_staff (station_id, user_id, role) VALUES ($1,$2,'manager')`,
        [stationId, userId]
      );

      await client.query("COMMIT");
      return { type: "station", stationId, managerId: userId, stationName: data.name };
    }

    if (data.type === "authority") {
      const hash = await bcrypt.hash(data.password, 10);
      const { rows: uRows } = await client.query(
        `INSERT INTO users (email, full_name, password_hash) VALUES ($1,$2,$3) RETURNING id`,
        [data.email, data.fullName, hash]
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT $1, id FROM roles WHERE name = 'AUTHORITY'`,
        [uRows[0].id]
      );
      await client.query("COMMIT");
      return { type: "authority", userId: uRows[0].id };
    }

    if (data.type === "distributor") {
      // Create organization
      const { rows: orgRows } = await client.query(
        `INSERT INTO organizations (name, type) VALUES ($1, 'distributor') RETURNING id`,
        [data.organizationName]
      );
      const orgId = orgRows[0].id;

      // Create distributor entity
      const { rows: distRows } = await client.query(
        `INSERT INTO distributors (organization_id, name) VALUES ($1,$2) RETURNING id`,
        [orgId, data.organizationName]
      );
      const distId = distRows[0].id;

      // Create user
      const hash = await bcrypt.hash(data.password, 10);
      const { rows: uRows } = await client.query(
        `INSERT INTO users (email, full_name, password_hash) VALUES ($1,$2,$3) RETURNING id`,
        [data.email, data.fullName, hash]
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
         SELECT $1, id, 'distributor', $2 FROM roles WHERE name = 'DISTRIBUTOR_USER'`,
        [uRows[0].id, distId]
      );

      await client.query("COMMIT");
      return { type: "distributor", distributorId: distId, userId: uRows[0].id };
    }

    throw new Error("Unknown entity type.");
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23505") throw new Error("An account with this email already exists.");
    throw err;
  } finally {
    client.release();
  }
}

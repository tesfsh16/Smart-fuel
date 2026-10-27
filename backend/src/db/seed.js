import bcrypt from "bcrypt";
import { pool } from "./pool.js";

// Demo seed data. Password for every demo account: "password123"
// Roles: driver, station manager, authority, distributor, platform admin.

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const passwordHash = await bcrypt.hash("password123", 10);

    // Organizations
    const stationOrg = await client.query(
      `INSERT INTO organizations (name, type) VALUES ('National Fuel Stations', 'station_company') RETURNING id`
    );
    const distributorOrg = await client.query(
      `INSERT INTO organizations (name, type) VALUES ('National Oil Distributor', 'distributor') RETURNING id`
    );
    const authorityOrg = await client.query(
      `INSERT INTO organizations (name, type) VALUES ('Ministry of Energy', 'authority') RETURNING id`
    );

    const stationOrgId = stationOrg.rows[0].id;
    const distributorOrgId = distributorOrg.rows[0].id;

    // Distributor
    const distributor = await client.query(
      `INSERT INTO distributors (organization_id, name) VALUES ($1, 'National Oil Distributor') RETURNING id`,
      [distributorOrgId]
    );
    const distributorId = distributor.rows[0].id;

    // Stations (matching the prototype demo stations)
    const stationInserts = [
      ["Bole Station A", "Addis Ababa", "Addis Ababa", "Bole Road, Addis Ababa", 8.9806, 38.7578],
      ["Kazanchis Station B", "Addis Ababa", "Addis Ababa", "Kazanchis, Addis Ababa", 9.0105, 38.7614],
      ["Megenagna Station C", "Addis Ababa", "Addis Ababa", "Megenagna, Addis Ababa", 9.0268, 38.7894],
    ];

    const stationIds = [];
    for (const s of stationInserts) {
      const res = await client.query(
        `INSERT INTO stations (organization_id, name, region, city, address, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [stationOrgId, ...s]
      );
      stationIds.push(res.rows[0].id);
    }

    // Helper: create a user + assign a role (with optional scope)
    async function createUser(name, email, roleName, scopeType = null, scopeId = null) {
      const user = await client.query(
        `INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING id`,
        [email, name, passwordHash]
      );
      const userId = user.rows[0].id;
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, scope_type, scope_id)
         SELECT $1, id, $2, $3 FROM roles WHERE name = $4`,
        [userId, scopeType, scopeId, roleName]
      );
      return userId;
    }

    // Demo accounts
    await createUser("Abebe Tadesse", "driver@demo.com", "DRIVER");
    const stationManagerId = await createUser(
      "Meron Alemu", "manager@demo.com", "STATION_MANAGER", "station", stationIds[0]
    );
    await client.query(
      `INSERT INTO station_staff (station_id, user_id, role) VALUES ($1, $2, 'manager')`,
      [stationIds[0], stationManagerId]
    );
    await createUser("Authority User", "authority@demo.com", "AUTHORITY");
    await createUser(
      "Distributor User", "distributor@demo.com", "DISTRIBUTOR_USER", "distributor", distributorId
    );
    await createUser("Platform Admin", "admin@demo.com", "PLATFORM_ADMIN");

    await client.query("COMMIT");
    console.log("✓ Seed data inserted.");
    console.log("");
    console.log("Demo accounts (password: password123):");
    console.log("  driver@demo.com      — Driver");
    console.log("  manager@demo.com     — Station Manager (Bole Station A)");
    console.log("  authority@demo.com    — Authority");
    console.log("  distributor@demo.com — Distributor");
    console.log("  admin@demo.com       — Platform Admin");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

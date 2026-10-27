import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getApplied(client) {
  const { rows } = await client.query(
    "SELECT name FROM schema_migrations ORDER BY name ASC"
  );
  return new Set(rows.map((r) => r.name));
}

function listMigrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

async function run() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const files = listMigrationFiles();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;

      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      console.log(`▶ Applying ${file} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`✓ Applied ${file}`);
        count++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`✗ Failed ${file}:`, err.message);
        throw err;
      }
    }

    if (count === 0) {
      console.log("No new migrations to apply.");
    } else {
      console.log(`Applied ${count} migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

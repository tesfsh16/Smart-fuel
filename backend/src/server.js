import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { assertDb } from "./db/pool.js";

async function main() {
  try {
    await assertDb();
    console.log("✓ Database connected.");
  } catch (err) {
    console.error("✗ Could not connect to the database.");
    console.error("  Make sure PostgreSQL is running (docker compose up -d).");
    console.error("  Detail:", err.message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`✓ SmartFuel API running on http://localhost:${config.port}`);
  });
}

main();

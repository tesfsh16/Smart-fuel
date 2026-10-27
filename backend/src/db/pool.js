import pg from "pg";
import { config } from "../config/env.js";

// config.pg is either { connectionString, ssl } (production)
// or { host, port, user, password, database } (local dev)
export const pool = new pg.Pool(config.pg);

export async function assertDb() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export function query(text, params) {
  return pool.query(text, params);
}

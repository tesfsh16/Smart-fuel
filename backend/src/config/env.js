import dotenv from "dotenv";

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

// Support both a single DATABASE_URL (Render/Railway/Heroku style)
// and individual PG* vars (local dev style).
function pgConfig() {
  const url = process.env.DATABASE_URL;
  if (url) {
    return { connectionString: url, ssl: { rejectUnauthorized: false } };
  }
  return {
    host:     required("PGHOST",     "localhost"),
    port:     parseInt(process.env.PGPORT ?? "5432", 10),
    user:     required("PGUSER",     "smartfuel"),
    password: required("PGPASSWORD", "smartfuel"),
    database: required("PGDATABASE", "smartfuel"),
  };
}

export const config = {
  port:    parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev:   (process.env.NODE_ENV ?? "development") === "development",

  pg: pgConfig(),

  jwt: {
    accessSecret:    required("JWT_ACCESS_SECRET",  "dev_access_secret"),
    refreshSecret:   required("JWT_REFRESH_SECRET",  "dev_refresh_secret"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES  ?? "15m",
    refreshExpiresIn:process.env.JWT_REFRESH_EXPIRES ?? "7d",
  },
};

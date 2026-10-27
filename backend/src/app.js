import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.js";
import authRoutes from "./modules/auth/routes.js";
import stationRoutes      from "./modules/station/routes.js";
import driverRoutes       from "./modules/driver/routes.js";
import governmentRoutes   from "./modules/government/routes.js";
import distributorRoutes  from "./modules/distributor/routes.js";
import adminRoutes        from "./modules/admin/routes.js";
import supplyRoutes       from "./modules/supply/routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  // CORS — allow the Vercel frontend (set FRONTEND_URL in Render env vars)
  const allowedOrigins = config.isDev
    ? true  // allow all in dev
    : [
        process.env.FRONTEND_URL,          // e.g. https://smartfuel.vercel.app
        /\.vercel\.app$/,                  // any Vercel preview URL
      ].filter(Boolean);

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  app.use(express.json());
  if (config.isDev) {
    app.use(morgan("dev"));
  }

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Routes
  app.use("/api/auth",         authRoutes);
  app.use("/api/station",      stationRoutes);
  app.use("/api/driver",       driverRoutes);
  app.use("/api/government",   governmentRoutes);
  app.use("/api/distributor",  distributorRoutes);
  app.use("/api/admin",        adminRoutes);
  app.use("/api/supply",       supplyRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

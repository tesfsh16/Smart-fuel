import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import {
  nationalOverview,
  stationSummaries,
  predictions,
  anomalies,
} from "./controller.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("AUTHORITY", "PLATFORM_ADMIN"));

router.get("/overview",   nationalOverview);
router.get("/stations",   stationSummaries);
router.get("/predictions", predictions);
router.get("/anomalies",  anomalies);

export default router;

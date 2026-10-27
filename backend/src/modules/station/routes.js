import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireStationScope } from "../../middleware/rbac.js";
import * as ctrl from "./controller.js";

const router = Router();

// Every station route requires auth + a station role assignment.
// requireStationScope reads the station from the JWT and attaches
// it to req.stationId — the station never comes from the URL.
router.use(requireAuth);
router.use(requireRole("STATION_STAFF", "STATION_MANAGER", "PLATFORM_ADMIN"));
router.use(requireStationScope);

router.get("/dashboard",             ctrl.dashboard);
router.get("/inventory",             ctrl.inventory);
router.get("/inventory/movements",   ctrl.inventoryMovements);
router.get("/reservations",          ctrl.reservations);
router.get("/queue",                 ctrl.queue);
router.get("/deliveries",            ctrl.deliveries);
router.post("/queue/:id/confirm",    ctrl.confirmFuelled);

export default router;

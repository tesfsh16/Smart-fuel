import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import {
  findStationsSchema,
  createReservationSchema,
} from "./validation.js";
import {
  findStations,
  createReservation,
  cancelReservation,
  myReservations,
  myQueue,
} from "./controller.js";

const router = Router();

// Station discovery is public — no auth required.
router.get("/stations", validate(findStationsSchema, "query"), findStations);

// Everything below requires a driver login.
router.use(requireAuth);
router.use(requireRole("DRIVER", "PLATFORM_ADMIN"));

router.get( "/reservations",         myReservations);
router.post("/reservations",         validate(createReservationSchema, "body"), createReservation);
router.post("/reservations/:id/cancel", cancelReservation);
router.get( "/queue",                myQueue);

export default router;

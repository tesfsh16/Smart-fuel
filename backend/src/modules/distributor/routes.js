import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import {
  createDeliverySchema,
  updateStatusSchema,
  reconcileSchema,
  updateSupplySchema,
} from "./validation.js";
import {
  getDeliveries,
  createDelivery,
  updateStatus,
  reconcile,
  getSupplyRequests,
  updateSupplyRequest,
} from "./controller.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("DISTRIBUTOR_USER", "PLATFORM_ADMIN"));

router.get( "/deliveries",                   getDeliveries);
router.post("/deliveries",                   validate(createDeliverySchema, "body"), createDelivery);
router.patch("/deliveries/:id/status",       validate(updateStatusSchema,   "body"), updateStatus);
router.post("/deliveries/:id/reconcile",     validate(reconcileSchema,      "body"), reconcile);

router.get( "/supply-requests",              getSupplyRequests);
router.patch("/supply-requests/:id/status",  validate(updateSupplySchema,   "body"), updateSupplyRequest);

export default router;

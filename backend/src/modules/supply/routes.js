import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole, requireStationScope } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import * as svc from "./service.js";

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  fuelCode: z.enum(["PETROL","DIESEL"]),
  quantity: z.coerce.number().positive(),
  notes:    z.string().optional(),
});

const reviewSchema = z.object({
  action:           z.enum(["approve","reject"]),
  approvedQuantity: z.coerce.number().positive().optional(),
  notes:            z.string().optional(),
});

const fulfilSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});

// Station — create + view own requests
router.post("/",
  requireRole("STATION_STAFF","STATION_MANAGER","PLATFORM_ADMIN"),
  requireStationScope,
  validate(createSchema,"body"),
  async (req,res,next) => {
    try { res.status(201).json(await svc.stationCreateRequest(req.stationId, req.body)); }
    catch(e){ next(e); }
  }
);

router.get("/station",
  requireRole("STATION_STAFF","STATION_MANAGER","PLATFORM_ADMIN"),
  requireStationScope,
  async (req,res,next) => {
    try { res.json(await svc.stationGetRequests(req.stationId)); }
    catch(e){ next(e); }
  }
);

// Authority — view all, approve/reject
router.get("/authority",
  requireRole("AUTHORITY","PLATFORM_ADMIN"),
  async (req,res,next) => {
    try { res.json(await svc.authorityGetRequests()); }
    catch(e){ next(e); }
  }
);

router.patch("/:id/review",
  requireRole("AUTHORITY","PLATFORM_ADMIN"),
  validate(reviewSchema,"body"),
  async (req,res,next) => {
    try {
      res.json(await svc.authorityReview(req.user.userId, parseInt(req.params.id), req.body));
    } catch(e){ next(e); }
  }
);

// Distributor — view approved, create delivery
router.get("/distributor",
  requireRole("DISTRIBUTOR_USER","PLATFORM_ADMIN"),
  async (req,res,next) => {
    try { res.json(await svc.distributorGetRequests(req.user.userId)); }
    catch(e){ next(e); }
  }
);

router.post("/:id/fulfil",
  requireRole("DISTRIBUTOR_USER","PLATFORM_ADMIN"),
  validate(fulfilSchema,"body"),
  async (req,res,next) => {
    try {
      res.json(await svc.distributorFulfil(req.user.userId, parseInt(req.params.id), req.body.scheduledAt));
    } catch(e){ next(e); }
  }
);

export default router;

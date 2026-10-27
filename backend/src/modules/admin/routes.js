import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { validate } from "../../middleware/validate.js";
import { getAdminStats, createEntity, toggleUserStatus, listUsers } from "./service.js";
import { createEntitySchema, toggleUserSchema } from "./validation.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole("PLATFORM_ADMIN"));

router.get("/stats",          async (req, res, next) => { try { res.json(await getAdminStats()); } catch(e) { next(e); } });
router.get("/users",          async (req, res, next) => { try { res.json(await listUsers()); } catch(e) { next(e); } });
router.post("/register",      validate(createEntitySchema, "body"), async (req, res, next) => { try { res.status(201).json(await createEntity(req.body)); } catch(e) { next(e); } });
router.patch("/users/:id/status", validate(toggleUserSchema, "body"), async (req, res, next) => { try { res.json(await toggleUserStatus(parseInt(req.params.id), req.body.status)); } catch(e) { next(e); } });

export default router;

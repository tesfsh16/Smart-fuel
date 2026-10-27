import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from "./validation.js";
import { register, login, refresh, logout, me } from "./controller.js";

const router = Router();

router.post("/register", validate(registerSchema, "body"), register);
router.post("/login", validate(loginSchema, "body"), login);
router.post("/refresh", validate(refreshSchema, "body"), refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;

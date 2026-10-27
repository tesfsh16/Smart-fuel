import * as authService from "./service.js";

export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation — email already taken
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    await authService.logout(req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

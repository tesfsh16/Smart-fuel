// Role-based access control middleware.
// req.user is populated by requireAuth: { userId, roles: [{ name, scopeType, scopeId }] }

// Pass one or more role names. The request is allowed if the user holds any of them.
export function requireRole(...roleNames) {
  const allowed = new Set(roleNames);
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(401).json({ error: "Not authenticated." });
    }
    const hasRole = req.user.roles.some((r) => allowed.has(r.name));
    if (!hasRole) {
      return res.status(403).json({ error: "You do not have permission to do this." });
    }
    next();
  };
}

// For station-scoped routes. Resolves the caller's station from their role scope
// and attaches it as req.stationId. A user may only ever act on their own station.
export function requireStationScope(req, res, next) {
  if (!req.user || !req.user.roles) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  const stationRole = req.user.roles.find(
    (r) => r.scopeType === "station" && r.scopeId != null
  );
  if (!stationRole) {
    return res
      .status(403)
      .json({ error: "You are not assigned to a station." });
  }
  req.stationId = stationRole.scopeId;
  req.user.stationRole = stationRole.name; // STATION_STAFF or STATION_MANAGER
  next();
}

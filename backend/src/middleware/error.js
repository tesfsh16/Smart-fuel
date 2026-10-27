// Central error handler. Use next(err) from any route.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: "Route not found." });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error("[error]", err);
  }
  res.status(status).json({
    error: err.message || "Something went wrong.",
  });
}

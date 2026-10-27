import { ApiError } from "./error.js";

// Zod validation middleware. Picks body, params, or query.
// usage: validate(schema, "body") | validate(schema, "params")
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const first = result.error.issues[0];
      const message = first
        ? `${first.path.join(".") || "value"}: ${first.message}`
        : "Invalid request.";
      return next(new ApiError(400, message));
    }
    req[source] = result.data;
    next();
  };
}

/**
 * Convert a backend risk level (LOW / HIGH / CRITICAL) to a
 * human-readable label that describes the STOCK AMOUNT, not the danger.
 *
 *   LOW risk     = High Stock  (green  — lots of fuel)
 *   HIGH risk    = Low Stock   (orange — fuel is running low)
 *   CRITICAL risk= Critical    (red    — nearly empty)
 */
export const RISK_LABEL = {
  LOW:      "High Stock",
  HIGH:     "Low Stock",
  CRITICAL: "Critical",
};

export function riskLabel(level) {
  return RISK_LABEL[level] || level;
}

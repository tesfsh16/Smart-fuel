/**
 * Convert a backend risk level (LOW / HIGH / CRITICAL) to a
 * human-readable label based on threshold status.
 *
 * Each fuel type is measured against its own thresholds independently:
 *   LOW risk      → "Normal"           — above the low threshold (e.g. > 3,000 L)
 *   HIGH risk     → "Below Threshold"  — below the low threshold (e.g. ≤ 3,000 L)
 *   CRITICAL risk → "Critical"         — below the critical threshold (e.g. ≤ 1,000 L)
 *
 * This avoids confusion: Petrol at 7,970 L and Diesel at 10,000 L can
 * both be "Normal" even though 7,970 < 10,000 — because each is
 * assessed against its own minimum, not compared to the other.
 */
export const RISK_LABEL = {
  LOW:      "Normal",
  HIGH:     "Below Threshold",
  CRITICAL: "Critical",
};

export function riskLabel(level) {
  return RISK_LABEL[level] || level;
}

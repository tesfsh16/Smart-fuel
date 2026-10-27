import { query } from "../../db/pool.js";

// ── helpers ────────────────────────────────────────────────────────────────

function riskLevel(qty, low, critical) {
  if (qty <= critical) return "CRITICAL";
  if (qty <= low)      return "HIGH";
  return "LOW";
}

// Hours until a station runs out at current consumption rate.
// Returns Infinity if there is no consumption data.
function hoursToEmpty(stockL, dailyUsageL) {
  if (!dailyUsageL || dailyUsageL <= 0) return Infinity;
  return (stockL / dailyUsageL) * 24;
}

// ── national overview ──────────────────────────────────────────────────────

export async function getNationalOverview() {
  // Total stock across all active stations
  const { rows: stockRows } = await query(
    `SELECT COALESCE(SUM(i.quantity), 0) AS total_stock,
            ft.code AS fuel_code,
            ft.name AS fuel_name
       FROM inventory i
       JOIN fuel_types ft ON ft.id = i.fuel_type_id
       JOIN stations s ON s.id = i.station_id
      WHERE s.status = 'active'
      GROUP BY ft.code, ft.name`
  );

  // Today's total usage across all stations
  const { rows: usageRows } = await query(
    `SELECT COALESCE(SUM(t.quantity_l), 0) AS daily_usage,
            ft.code AS fuel_code
       FROM transactions t
       JOIN fuel_types ft ON ft.id = t.fuel_type_id
      WHERE t.created_at >= CURRENT_DATE
      GROUP BY ft.code`
  );
  const usageMap = {};
  usageRows.forEach(r => { usageMap[r.fuel_code] = parseFloat(r.daily_usage); });

  // Station status counts
  const { rows: stationRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE s.status = 'active') AS total_active,
       COUNT(*) FILTER (
         WHERE s.status = 'active'
           AND EXISTS (
             SELECT 1 FROM inventory i
             JOIN fuel_types ft2 ON ft2.id = i.fuel_type_id
             WHERE i.station_id = s.id
               AND i.quantity <= i.threshold_critical
           )
       ) AS critical_count,
       COUNT(*) FILTER (
         WHERE s.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM inventory i2
             WHERE i2.station_id = s.id
               AND i2.quantity <= i2.threshold_critical
           )
           AND EXISTS (
             SELECT 1 FROM inventory i3
             WHERE i3.station_id = s.id
               AND i3.quantity <= i3.threshold_low
           )
       ) AS low_count
     FROM stations s`
  );

  // Active reservations and queue
  const { rows: opRows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active') AS active_reservations,
       0 AS avg_wait
     FROM reservations`
  );
  const { rows: qRows } = await query(
    `SELECT COUNT(*) AS total_queue FROM queue_entries WHERE status = 'waiting'`
  );

  const stats = stationRows[0];
  const op    = opRows[0];

  // Build fuel summary
  const fuels = {};
  for (const row of stockRows) {
    fuels[row.fuel_code] = {
      fuelName: row.fuel_name,
      totalStockL: parseFloat(row.total_stock),
      dailyUsageL: usageMap[row.fuel_code] || 0,
    };
  }

  // Overall risk — CRITICAL if any station is critical, else HIGH if any is low
  const criticalCount = parseInt(stats.critical_count);
  const lowCount      = parseInt(stats.low_count);
  const overallRisk   = criticalCount > 0 ? "CRITICAL" : lowCount > 0 ? "HIGH" : "LOW";

  return {
    totalStationsActive:  parseInt(stats.total_active),
    criticalStations:     criticalCount,
    lowStations:          lowCount,
    activeReservations:   parseInt(op.active_reservations),
    totalQueue:           parseInt(qRows[0].total_queue),
    overallRisk,
    fuels,
  };
}

// ── per-station summary for the map / overview table ──────────────────────

export async function getStationSummaries() {
  const { rows } = await query(
    `SELECT
       s.id, s.name, s.region, s.address, s.lat, s.lng,
       i.quantity, i.capacity, i.threshold_low, i.threshold_critical,
       i.updated_at,
       ft.code AS fuel_code, ft.name AS fuel_name,
       ( SELECT COALESCE(SUM(t.quantity_l), 0)
           FROM transactions t
          WHERE t.station_id = s.id
            AND t.fuel_type_id = i.fuel_type_id
            AND t.created_at >= CURRENT_DATE
       ) AS today_usage,
       ( SELECT COUNT(*) FROM queue_entries qe
          WHERE qe.station_id = s.id AND qe.status = 'waiting'
       ) AS queue_count,
       ( SELECT COUNT(*) FROM reservations r
          WHERE r.station_id = s.id AND r.status = 'active'
       ) AS active_reservations
     FROM stations s
     JOIN inventory i ON i.station_id = s.id
     JOIN fuel_types ft ON ft.id = i.fuel_type_id
     WHERE s.status = 'active'
     ORDER BY s.name, ft.code`
  );

  // Group by station
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        region: row.region,
        address: row.address,
        lat: row.lat,
        lng: row.lng,
        queueCount: parseInt(row.queue_count),
        activeReservations: parseInt(row.active_reservations),
        fuels: {},
        riskLevel: "LOW",
        lastUpdated: row.updated_at,
      });
    }
    const st  = map.get(row.id);
    const risk = riskLevel(row.quantity, row.threshold_low, row.threshold_critical);
    st.fuels[row.fuel_code] = {
      fuelName: row.fuel_name,
      quantity: parseFloat(row.quantity),
      capacity: parseFloat(row.capacity),
      todayUsageL: parseFloat(row.today_usage),
      percentFull: Math.round((row.quantity / row.capacity) * 100),
      riskLevel: risk,
    };
    // Escalate station risk to worst fuel risk
    const rank = { LOW: 0, HIGH: 1, CRITICAL: 2 };
    if ((rank[risk] ?? 0) > (rank[st.riskLevel] ?? 0)) st.riskLevel = risk;
  }

  return Array.from(map.values());
}

// ── shortage predictions (rule-based, explainable) ────────────────────────

export async function getShortagesPredictions() {
  const stations = await getStationSummaries();
  const predictions = [];

  for (const st of stations) {
    for (const [fuelCode, fuel] of Object.entries(st.fuels)) {
      // Average daily use from last 7 days
      const { rows: avgRows } = await query(
        `SELECT COALESCE(AVG(daily_total), 0) AS avg_daily
           FROM (
             SELECT DATE(t.created_at) AS day,
                    SUM(t.quantity_l) AS daily_total
               FROM transactions t
               JOIN fuel_types ft ON ft.id = t.fuel_type_id
              WHERE t.station_id = $1 AND ft.code = $2
                AND t.created_at >= NOW() - INTERVAL '7 days'
              GROUP BY DATE(t.created_at)
           ) daily`,
        [st.id, fuelCode]
      );
      const avgDailyL = parseFloat(avgRows[0].avg_daily) || fuel.todayUsageL || 0;

      // Next scheduled delivery
      const { rows: delRows } = await query(
        `SELECT d.scheduled_at, di.expected_quantity
           FROM deliveries d
           JOIN delivery_items di ON di.delivery_id = d.id
           JOIN fuel_types ft ON ft.id = di.fuel_type_id
          WHERE d.station_id = $1
            AND ft.code = $2
            AND d.status IN ('scheduled','in_transit')
          ORDER BY d.scheduled_at ASC
          LIMIT 1`,
        [st.id, fuelCode]
      );
      const nextDel = delRows[0];
      const hoursToDelivery = nextDel
        ? Math.max(0, (new Date(nextDel.scheduled_at) - Date.now()) / 3_600_000)
        : null;

      const h2e = hoursToEmpty(fuel.quantity, avgDailyL);

      // Compare today's usage to 7-day average to detect demand spike
      const demandChange = avgDailyL > 0
        ? Math.round(((fuel.todayUsageL - avgDailyL) / avgDailyL) * 100)
        : 0;

      // Determine if a prediction is worth surfacing
      const willRunOutBeforeDelivery =
        nextDel && h2e < hoursToDelivery;
      const noDeliveryAndLow =
        !nextDel && fuel.riskLevel !== "LOW";
      const spikeRisk =
        demandChange >= 25 && fuel.riskLevel !== "LOW";

      if (!willRunOutBeforeDelivery && !noDeliveryAndLow && !spikeRisk) continue;

      // Risk level for the prediction
      let predRisk = "MODERATE";
      if (h2e < 12 || fuel.riskLevel === "CRITICAL") predRisk = "HIGH";
      if (h2e < 6)                                     predRisk = "CRITICAL";

      const reasons = [];
      if (demandChange > 0)      reasons.push(`Demand +${demandChange}% above recent baseline`);
      if (demandChange < 0)      reasons.push(`Demand ${demandChange}% below recent baseline`);
      reasons.push(`Current stock: ${fuel.quantity.toLocaleString()} L`);
      if (avgDailyL > 0) reasons.push(`Average daily consumption: ${avgDailyL.toLocaleString(undefined, { maximumFractionDigits: 0 })} L`);
      if (nextDel) {
        reasons.push(`Next delivery: ~${Math.round(hoursToDelivery)} hours away (${new Date(nextDel.scheduled_at).toLocaleString()})`);
      } else {
        reasons.push("No upcoming delivery scheduled");
      }
      if (h2e < Infinity) {
        reasons.push(`Estimated time to empty: ~${Math.round(h2e)} hours`);
      }

      predictions.push({
        stationId:   st.id,
        stationName: st.name,
        region:      st.region,
        fuelCode,
        fuelName:    fuel.fuelName,
        riskLevel:   predRisk,
        currentStockL:   fuel.quantity,
        avgDailyUsageL:  avgDailyL,
        demandChangePct: demandChange,
        hoursToEmpty:    h2e < Infinity ? Math.round(h2e) : null,
        nextDeliveryHours: nextDel ? Math.round(hoursToDelivery) : null,
        reasons,
        recommendation: buildRecommendation(st, fuelCode, fuel, predRisk, hoursToDelivery, h2e),
      });
    }
  }

  // Sort: CRITICAL first
  const rank = { CRITICAL: 0, HIGH: 1, MODERATE: 2 };
  return predictions.sort((a, b) => (rank[a.riskLevel] ?? 3) - (rank[b.riskLevel] ?? 3));
}

function buildRecommendation(st, fuelCode, fuel, risk, hoursToDelivery, h2e) {
  if (risk === "CRITICAL") {
    return `Immediate action needed. Contact distributor to expedite delivery. Consider activating queue restrictions at ${st.name}.`;
  }
  if (hoursToDelivery && h2e < hoursToDelivery) {
    return `Stock may be exhausted before the scheduled delivery. Review replenishment timeline or arrange an earlier delivery.`;
  }
  return `Monitor closely. If demand continues at this rate, consider scheduling an additional delivery within 24 hours.`;
}

// ── anomaly detection (threshold-based, explainable) ──────────────────────

export async function getAnomalies() {
  const anomalies = [];

  // 1. Unusual daily sales volume (> 50% above 7-day average)
  const { rows: salesRows } = await query(
    `SELECT
       s.id AS station_id, s.name AS station_name, s.region,
       ft.code AS fuel_code, ft.name AS fuel_name,
       COALESCE(SUM(t.quantity_l) FILTER (WHERE t.created_at >= CURRENT_DATE), 0) AS today_sales,
       COALESCE(AVG(daily_total), 0) AS avg_daily
     FROM stations s
     JOIN fuel_types ft ON ft.id IN (SELECT id FROM fuel_types)
     LEFT JOIN transactions t ON t.station_id = s.id AND t.fuel_type_id = ft.id
     LEFT JOIN (
       SELECT station_id, fuel_type_id,
              DATE(created_at) AS day,
              SUM(quantity_l) AS daily_total
         FROM transactions
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY station_id, fuel_type_id, DATE(created_at)
     ) daily ON daily.station_id = s.id AND daily.fuel_type_id = ft.id
     WHERE s.status = 'active'
     GROUP BY s.id, s.name, s.region, ft.code, ft.name
     HAVING COALESCE(SUM(t.quantity_l) FILTER (WHERE t.created_at >= CURRENT_DATE), 0) > 0`
  );

  for (const row of salesRows) {
    const today  = parseFloat(row.today_sales);
    const avg    = parseFloat(row.avg_daily);
    if (avg <= 0) continue;
    const ratio = today / avg;
    if (ratio < 1.4) continue; // only flag if > 40% above average

    const changePct = Math.round((ratio - 1) * 100);
    anomalies.push({
      id:          `ANO-SALES-${row.station_id}-${row.fuel_code}`,
      stationId:   row.station_id,
      stationName: row.station_name,
      region:      row.region,
      type:        "Unusual Sales Volume",
      severity:    ratio >= 1.8 ? "HIGH" : "MEDIUM",
      fuelName:    row.fuel_name,
      typical:     `${avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}–${(avg * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })} L/day`,
      observed:    `${today.toLocaleString(undefined, { maximumFractionDigits: 0 })} L today (+${changePct}%)`,
      status:      "Flagged",
      detectedAt:  new Date().toISOString(),
      explanation: `Today's ${row.fuel_name.toLowerCase()} sales are ${changePct}% above the recent 7-day average. This may indicate unusually high demand or a data entry issue.`,
    });
  }

  // 2. Delivery discrepancies
  const { rows: delRows } = await query(
    `SELECT
       d.id AS delivery_id,
       s.id AS station_id, s.name AS station_name, s.region,
       ft.name AS fuel_name,
       di.expected_quantity, di.received_quantity,
       d.arrived_at
     FROM deliveries d
     JOIN delivery_items di ON di.delivery_id = d.id AND di.status = 'discrepancy'
     JOIN stations s ON s.id = d.station_id
     JOIN fuel_types ft ON ft.id = di.fuel_type_id
     ORDER BY d.arrived_at DESC NULLS LAST
     LIMIT 20`
  );

  for (const row of delRows) {
    const expected = parseFloat(row.expected_quantity);
    const received = parseFloat(row.received_quantity);
    const diff     = received - expected;
    const pct      = Math.round(Math.abs(diff / expected) * 100);
    anomalies.push({
      id:          `ANO-DEL-${row.delivery_id}`,
      stationId:   row.station_id,
      stationName: row.station_name,
      region:      row.region,
      type:        "Delivery Discrepancy",
      severity:    pct >= 10 ? "HIGH" : "MEDIUM",
      fuelName:    row.fuel_name,
      typical:     `Delivery: ${expected.toLocaleString()} L`,
      observed:    `Received: ${received.toLocaleString()} L  (Δ ${diff.toLocaleString()} L, ${pct}%)`,
      status:      "Under Review",
      detectedAt:  row.arrived_at || new Date().toISOString(),
      explanation: `The ${row.fuel_name.toLowerCase()} delivery recorded a ${Math.abs(diff).toLocaleString()} L difference (${pct}%) between expected and received quantities. This requires manual review.`,
    });
  }

  // Sort by severity
  const sev = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return anomalies.sort((a, b) => (sev[a.severity] ?? 3) - (sev[b.severity] ?? 3));
}

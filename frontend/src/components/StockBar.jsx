export default function StockBar({ label, current, capacity, threshold }) {
  const pct = Math.min(100, Math.round((current / capacity) * 100));
  const thPct = Math.round((threshold / capacity) * 100);
  const color = pct < 20 ? "#dc2626" : pct < 40 ? "#1d4ed8" : "#1d4ed8";

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: "#64748b" }}>{current.toLocaleString()} L <span style={{ fontSize: 11 }}>/ {capacity.toLocaleString()} L</span></span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: "#e2e8f0", position: "relative", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width .4s" }} />
        <div style={{
          position: "absolute", top: 0, left: `${thPct}%`,
          width: 2, height: "100%", background: "#dc2626", opacity: .6
        }} />
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{pct}% full · threshold {threshold.toLocaleString()} L</div>
    </div>
  );
}

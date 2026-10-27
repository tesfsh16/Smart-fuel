export default function StatBox({ label, value, sub, accent = false }) {
  return (
    <div style={{
      background: accent ? "#1d4ed8" : "#ffffff",
      border: `1px solid ${accent ? "#1d4ed8" : "#e2e8f0"}`,
      borderRadius: 12,
      padding: "18px 22px",
      minWidth: 140
    }}>
      <div style={{ fontSize: 13, color: accent ? "rgba(255,255,255,.8)" : "#64748b", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? "#fff" : "#0f172a", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? "rgba(255,255,255,.65)" : "#64748b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const colors = {
  HIGH:           { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  CRITICAL:       { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  LOW:            { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  MODERATE:       { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  MEDIUM:         { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Active:         { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  Completed:      { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
  Scheduled:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "In Transit":   { bg: "#dbeafe", color: "#1e3a8a", border: "#93c5fd" },
  Flagged:        { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  "Under Review": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Pending:        { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
};

export default function Badge({ label }) {
  const s = colors[label] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: ".3px",
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`
    }}>
      {label}
    </span>
  );
}

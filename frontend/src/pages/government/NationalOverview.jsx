import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getOverview, getStations } from "../../api/government";

const RISK = {
  LOW:      { badge: "bg-green-50 text-green-700 border-green-200",   dot: "bg-green-500"  },
  HIGH:     { badge: "bg-amber-50 text-amber-700 border-amber-200",   dot: "bg-amber-400"  },
  CRITICAL: { badge: "bg-red-50 text-red-700 border-red-200",         dot: "bg-red-500"    },
  MODERATE: { badge: "bg-blue-50 text-blue-700 border-blue-200",      dot: "bg-blue-500"   },
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function RiskBadge({ level }) {
  const s = RISK[level] || RISK.LOW;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {level}
    </span>
  );
}

export default function NationalOverview() {
  const ovApi  = useApi(getOverview);
  const stApi  = useApi(getStations);
  const loading = ovApi.loading || stApi.loading;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  const ov = ovApi.data;
  const stations = stApi.data || [];

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="National Overview" subtitle="Aggregated fuel intelligence — authorized access only" />

      <div className="p-6 space-y-6">
        {/* Overall risk banner */}
        {ov?.overallRisk !== "LOW" && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
            ov.overallRisk === "CRITICAL"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <span className="text-lg">{ov.overallRisk === "CRITICAL" ? "🔴" : "⚠️"}</span>
            National fuel situation: <strong>{ov.overallRisk}</strong> —{" "}
            {ov.criticalStations > 0
              ? `${ov.criticalStations} station(s) at critical stock level.`
              : `${ov.lowStations} station(s) below low threshold.`}
          </div>
        )}

        {/* National stats */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">National Situation</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Stations"   value={ov?.totalStationsActive ?? "—"} />
            <StatCard label="Critical Stations" value={ov?.criticalStations ?? "—"} />
            <StatCard label="Active Queue"      value={ov?.totalQueue ?? "—"} sub="vehicles waiting" />
            <StatCard label="Reservations"      value={ov?.activeReservations ?? "—"} sub="active" />
          </div>
        </section>

        {/* Fuel totals */}
        {ov?.fuels && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Total Network Stock</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(ov.fuels).map(([code, f]) => (
                <div key={code} className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-sm font-semibold text-slate-700 mb-1">{f.fuelName}</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {f.totalStockL.toLocaleString()} L
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Today's usage: {f.dailyUsageL.toLocaleString(undefined, { maximumFractionDigits: 0 })} L
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Station table */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">All Stations</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Station", "Region", "Petrol", "Diesel", "Queue", "Risk", "Updated"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-5 last:hidden last:lg:table-cell">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stations.map(st => {
                  const p = st.fuels["PETROL"];
                  const d = st.fuels["DIESEL"];
                  return (
                    <tr key={st.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{st.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{st.region}</td>
                      <td className="px-4 py-3">
                        {p ? (
                          <span className="text-xs font-mono">
                            {p.quantity.toLocaleString()} L{" "}
                            <span className={`ml-1 text-[10px] font-bold ${p.riskLevel === "CRITICAL" ? "text-red-600" : p.riskLevel === "HIGH" ? "text-amber-600" : "text-green-600"}`}>
                              {p.riskLevel}
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {d ? (
                          <span className="text-xs font-mono">
                            {d.quantity.toLocaleString()} L{" "}
                            <span className={`ml-1 text-[10px] font-bold ${d.riskLevel === "CRITICAL" ? "text-red-600" : d.riskLevel === "HIGH" ? "text-amber-600" : "text-green-600"}`}>
                              {d.riskLevel}
                            </span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{st.queueCount} vehicles</td>
                      <td className="px-4 py-3"><RiskBadge level={st.riskLevel} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">
                        {new Date(st.lastUpdated).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

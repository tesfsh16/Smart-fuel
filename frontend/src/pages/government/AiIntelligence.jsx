import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getPredictions } from "../../api/government";

const RISK = {
  CRITICAL: { card: "bg-red-50/30",    badge: "bg-red-50 text-red-700 border-red-200"    },
  HIGH:     { card: "bg-amber-50/20",  badge: "bg-amber-50 text-amber-700 border-amber-200" },
  MODERATE: { card: "bg-blue-50/20",   badge: "bg-blue-50 text-blue-700 border-blue-200"   },
};

export default function AiIntelligence() {
  const { data: predictions, loading, error, refetch } = useApi(getPredictions);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="AI Intelligence" subtitle="Demand and shortage predictions — rule-based, explainable" />

      <div className="p-6 space-y-4">
        {/* Explainability note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>How this works:</strong> Each prediction is based on current stock level,
            average daily consumption (7-day baseline), upcoming delivery schedule, and
            today's demand compared to that baseline. Every prediction shows its reasoning.
          </p>
        </div>

        {loading && <div className="text-center text-slate-400 text-sm py-16">Analysing data…</div>}

        {error && (
          <div className="text-center py-10">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button onClick={refetch} className="text-xs text-blue-700 underline">Retry</button>
          </div>
        )}

        {!loading && !error && predictions?.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-slate-600 font-medium">No shortage risks detected</p>
            <p className="text-slate-400 text-sm mt-1">All stations are operating within normal parameters.</p>
          </div>
        )}

        {!loading && !error && predictions?.map((p, i) => {
          const s = RISK[p.riskLevel] || RISK.MODERATE;
          return (
            <div key={i} className={`bg-white rounded-xl border border-slate-200 p-5 ${s.card}`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-slate-900">{p.stationName}</p>
                  <p className="text-xs text-slate-500">{p.region} · {p.fuelName}</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border flex-shrink-0 ${s.badge}`}>
                  {p.riskLevel} RISK
                </span>
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { l: "Current stock",     v: `${p.currentStockL.toLocaleString()} L` },
                  { l: "Avg daily use",     v: p.avgDailyUsageL > 0 ? `${p.avgDailyUsageL.toLocaleString(undefined, { maximumFractionDigits: 0 })} L` : "No data" },
                  { l: "Demand change",     v: p.demandChangePct !== 0 ? `${p.demandChangePct > 0 ? "+" : ""}${p.demandChangePct}%` : "Normal" },
                  { l: "Time to empty",     v: p.hoursToEmpty != null ? `~${p.hoursToEmpty}h` : "Unknown" },
                ].map(({ l, v }) => (
                  <div key={l} className="bg-slate-50 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{l}</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              {/* Reasons */}
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Why this prediction</p>
                <ul className="space-y-1">
                  {p.reasons.map((r, ri) => (
                    <li key={ri} className="flex gap-2 text-xs text-slate-700">
                      <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendation */}
              <div className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommended action</p>
                <p className="text-sm text-slate-700">{p.recommendation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

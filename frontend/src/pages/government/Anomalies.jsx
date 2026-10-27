import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getAnomalies } from "../../api/government";

const SEV = {
  HIGH:   { card: "", badge: "bg-red-50 text-red-700 border-red-200"   },
  MEDIUM: { card: "", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  LOW:    { card: "", badge: "bg-blue-50 text-blue-700 border-blue-200"  },
};

const STATUS = {
  "Flagged":      "bg-amber-50 text-amber-700 border-amber-200",
  "Under Review": "bg-blue-50 text-blue-700 border-blue-200",
  "Resolved":     "bg-green-50 text-green-700 border-green-200",
};

export default function Anomalies() {
  const { data: anomalies, loading, error, refetch } = useApi(getAnomalies);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Anomalies" subtitle="Unusual patterns flagged for review" />

      <div className="p-6 space-y-4">
        {/* Principle note */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-600">
            Anomalies are flagged automatically based on statistical thresholds.
            They indicate patterns that <strong>require review</strong> — not automatic accusations.
            All decisions require authorized human review.
          </p>
        </div>

        {loading && <div className="text-center text-slate-400 text-sm py-16">Scanning for anomalies…</div>}

        {error && (
          <div className="text-center py-10">
            <p className="text-red-600 text-sm mb-2">{error}</p>
            <button onClick={refetch} className="text-xs text-blue-700 underline">Retry</button>
          </div>
        )}

        {!loading && !error && anomalies?.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-slate-600 font-medium">No anomalies detected</p>
            <p className="text-slate-400 text-sm mt-1">All operations are within normal parameters.</p>
          </div>
        )}

        {!loading && !error && anomalies?.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {anomalies.length} anomal{anomalies.length === 1 ? "y" : "ies"} detected
              </p>
              <button onClick={refetch} className="text-xs text-blue-700 border border-blue-200 bg-white px-3 py-1.5 rounded-lg">
                Refresh
              </button>
            </div>

            {anomalies.map(a => {
              const s = SEV[a.severity] || SEV.MEDIUM;
              return (
                <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span>{s.icon}</span>
                        <p className="font-bold text-slate-900">{a.stationName}</p>
                      </div>
                      <p className="text-xs text-slate-500">{a.region}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${s.badge}`}>
                        {a.severity}
                      </span>
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS[a.status] || STATUS["Flagged"]}`}>
                        {a.status}
                      </span>
                    </div>
                  </div>

                  {/* Type + fuel */}
                  <p className="text-sm font-semibold text-slate-800 mb-3">
                    {a.type}
                    {a.fuelName && <span className="text-slate-400 font-normal ml-2">· {a.fuelName}</span>}
                  </p>

                  {/* Typical vs observed */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Typical</p>
                      <p className="text-xs font-semibold text-slate-700">{a.typical}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Observed</p>
                      <p className="text-xs font-semibold text-red-700">{a.observed}</p>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Explanation</p>
                    <p className="text-sm text-slate-700">{a.explanation}</p>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 text-right">
                    Detected: {new Date(a.detectedAt).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

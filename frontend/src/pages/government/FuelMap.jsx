import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getStations } from "../../api/government";
import { riskLabel } from "../../utils/riskLabel.js";

const RISK_STYLES = {
  LOW:      { bar: "bg-green-500",  text: "text-green-600",  dot: "bg-green-500"  },
  HIGH:     { bar: "bg-amber-500",  text: "text-amber-600",  dot: "bg-amber-500"  },
  CRITICAL: { bar: "bg-red-500",    text: "text-red-600",    dot: "bg-red-500"    },
};

export default function FuelMap() {
  const { data: stations, loading } = useApi(getStations);
  const [selected, setSelected] = useState(null);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Station Overview" subtitle="Fuel levels across all active stations" />

      <div className="p-6 space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          {[["LOW","text-green-600"],["HIGH","text-amber-600"],["CRITICAL","text-red-600"]].map(([level,tc]) => (
            <span key={level} className={tc}>{riskLabel(level)}</span>
          ))}
        </div>

        {loading && <div className="text-center text-slate-400 text-sm py-16">Loading stations…</div>}

        {/* Station cards */}
        {!loading && stations?.map(st => {
          const s = RISK_STYLES[st.riskLevel] || RISK_STYLES.LOW;
          const isSelected = selected?.id === st.id;
          return (
            <div
              key={st.id}
              className={`bg-white rounded-xl border cursor-pointer transition-all ${
                isSelected ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => setSelected(isSelected ? null : st)}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${s.dot}`} />
                    <p className="font-semibold text-slate-900">{st.name}</p>
                  </span>
                  <p className="text-xs text-slate-400">{st.address}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${s.text}`}>{riskLabel(st.riskLevel)}</span>
                  <span className="text-slate-300 text-sm">{isSelected ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(st.fuels).map(f => {
                      const fs = RISK_STYLES[f.riskLevel] || RISK_STYLES.LOW;
                      return (
                        <div key={f.fuelName} className="bg-slate-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-slate-700">{f.fuelName}</p>
                            <span className={`text-[10px] font-semibold ${fs.text}`}>{riskLabel(f.riskLevel)}</span>
                          </div>
                          <p className="text-lg font-bold text-slate-900">{f.quantity.toLocaleString()} L</p>
                          <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                            <div className={`h-full ${fs.bar} rounded-full`} style={{ width: `${f.percentFull}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">{f.percentFull}% of capacity</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-6 text-xs text-slate-500 pt-1">
                    <span>Queue: <strong className="text-slate-800">{st.queueCount} vehicles</strong></span>
                    <span>Active reservations: <strong className="text-slate-800">{st.activeReservations}</strong></span>
                    <span>Updated: <strong className="text-slate-800">{new Date(st.lastUpdated).toLocaleTimeString()}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

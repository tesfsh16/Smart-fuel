import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import { useApi } from "../../hooks/useApi";
import { findStations } from "../../api/driver";

const FILTERS = ["All", "PETROL", "DIESEL"];

const RISK = {
  LOW:      { bar: "bg-green-500",  text: "text-green-600"  },
  HIGH:     { bar: "bg-amber-500",  text: "text-amber-600"  },
  CRITICAL: { bar: "bg-red-500",    text: "text-red-600"    },
};

function timeSince(iso) {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)} hr ago`;
}

export default function FindFuel() {
  const [fuel, setFuel] = useState("All");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stations, loading, error, refetch } = useApi(
    () => findStations(fuel),
    [fuel]
  );

  function handleReserve(station) {
    if (!user) {
      // Save station so Reserve page can recover it after registration
      sessionStorage.setItem("smartfuel_pending_station", JSON.stringify(station));
      navigate("/register", { state: { from: { pathname: "/driver/reserve" } } });
    } else {
      navigate("/driver/reserve", { state: { station } });
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">Find Fuel</h2>
        <p className="text-xs text-slate-500 mt-0.5">Addis Ababa · Updated live</p>
      </div>

      {/* Fuel filter */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFuel(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              fuel === f
                ? "bg-blue-700 text-white border-blue-700"
                : "bg-white text-slate-500 border-slate-200"
            }`}
          >
            {f === "All" ? "All Fuels" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-slate-400 text-sm py-16">Loading stations…</div>
      )}

      {error && (
        <div className="text-center py-10">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button onClick={refetch} className="text-xs text-blue-700 underline">Retry</button>
        </div>
      )}

      {!loading && !error && stations?.length === 0 && (
        <div className="text-center text-slate-400 text-sm py-16">No stations found.</div>
      )}

      {/* Responsive grid: 1 column on mobile, 2 on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {!loading && !error && stations?.map(station => {
        const r = RISK[station.riskLevel] || RISK.LOW;
        const fuels = Object.values(station.fuels);

        return (
          <div
            key={station.id}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-bold text-slate-900">{station.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{station.address}</p>
              </div>
              <span className={`text-[11px] font-semibold flex-shrink-0 ${r.text}`}>
                {station.riskLevel}
              </span>
            </div>

            {/* Fuel levels */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {fuels.map(f => {
                const fr = RISK[f.riskLevel] || RISK.LOW;
                return (
                  <div key={f.fuelCode} className="bg-slate-50 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-slate-700">{f.fuelName}</p>
                      <span className={`text-[10px] font-semibold ${(RISK[f.riskLevel]||RISK.LOW).text}`}>{f.riskLevel}</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${fr.bar} rounded-full`} style={{ width: `${f.percentFull}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{f.quantity.toLocaleString()} L</p>
                  </div>
                );
              })}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { l: "Queue",   v: `${station.queueCount} vehicles` },
                { l: "Updated", v: timeSince(station.lastUpdated) },
              ].map(({ l, v }) => (
                <div key={l} className="text-center bg-slate-50 rounded-lg py-2">
                  <p className="text-[10px] text-slate-400">{l}</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleReserve(station)}
              disabled={station.riskLevel === "CRITICAL"}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                station.riskLevel === "CRITICAL"
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-[#1e3a5f] text-white hover:bg-[#2d5282]"
              }`}
            >
              {station.riskLevel === "CRITICAL" ? "Stock Critical — Unavailable" : "Reserve Fuel"}
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );
}

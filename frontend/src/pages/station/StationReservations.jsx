import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getReservations } from "../../api/station";

const STATUS_TABS = ["active", "completed", "expired", "no_show", "cancelled"];

const STATUS_STYLES = {
  active:    "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  expired:   "bg-slate-50 text-slate-500 border-slate-200",
  no_show:   "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function StationReservations() {
  const [status, setStatus] = useState("active");
  const { data, loading, error } = useApi(() => getReservations(status), [status]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Reservations" subtitle="Manage fuel reservations" />

      <div className="p-6">
        {/* Status tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors capitalize ${
                status === s
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-slate-400 text-sm py-12">Loading…</div>
        )}
        {error && (
          <div className="text-center text-red-600 text-sm py-12">{error}</div>
        )}

        {!loading && !error && data?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No {status.replace("_", " ")} reservations.
          </div>
        )}

        {!loading && !error && data?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Plate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fuel</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Expires</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">#{r.queue_number}</td>
                    <td className="px-4 py-3 text-slate-800 font-medium">{r.driver_name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs hidden sm:table-cell">{r.plate_number || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{r.fuel_name}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{parseFloat(r.amount_l)} L</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 hidden md:table-cell">{r.code}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.active}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                      {r.expires_at ? new Date(r.expires_at).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

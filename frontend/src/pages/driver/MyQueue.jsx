import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { getMyQueue, getMyReservations, cancelReservation } from "../../api/driver";
import { useState } from "react";

const STATUS_STYLES = {
  active:    "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  expired:   "bg-slate-50 text-slate-500 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  no_show:   "bg-amber-50 text-amber-700 border-amber-200",
};

export default function MyQueue() {
  const navigate = useNavigate();
  const { data: active, loading: ql, refetch: refetchQ } = useApi(getMyQueue);
  const { data: history, loading: hl, refetch: refetchH } = useApi(getMyReservations);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  async function handleCancel(id) {
    if (!window.confirm("Cancel this reservation?")) return;
    setCancelling(true);
    setCancelError("");
    try {
      await cancelReservation(id);
      refetchQ();
      refetchH();
    } catch (err) {
      setCancelError(err.message || "Cancel failed.");
    } finally {
      setCancelling(false);
    }
  }

  const loading = ql || hl;

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">My Queue</h2>
        <p className="text-xs text-slate-500 mt-0.5">Your active reservation and history</p>
      </div>

      {loading && (
        <div className="text-center text-slate-400 text-sm py-10">Loading…</div>
      )}

      {/* Active reservation */}
      {!ql && (
        <>
          {!active ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm mb-4">No active reservation.</p>
              <button
                onClick={() => navigate("/driver")}
                className="bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
              >
                Find Fuel
              </button>
            </div>
          ) : (
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-slate-500">Active Reservation</p>
                <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-semibold capitalize">
                  {active.status}
                </span>
              </div>

              <div className="text-center mb-4">
                <p className="text-5xl font-black tracking-tight text-slate-900">#{active.queue_number}</p>
                <p className="text-slate-500 text-sm mt-1">Queue number</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center mb-4">
                <p className="text-2xl font-bold font-mono tracking-widest text-slate-900">{active.code}</p>
                <p className="text-slate-400 text-xs mt-0.5">Show this code at the station</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Station</p>
                  <p className="font-semibold mt-0.5 text-sm text-slate-900">{active.station_name}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Fuel</p>
                  <p className="font-semibold mt-0.5 text-slate-900">{active.fuel_name} · {parseFloat(active.amount_l)} L</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Position</p>
                  <p className="font-semibold mt-0.5 text-slate-900">
                    {active.queue_position != null ? `#${active.queue_position}` : "—"}
                    {active.ahead_count > 0 && (
                      <span className="text-slate-400 text-xs ml-1">({active.ahead_count} ahead)</span>
                    )}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-slate-400 text-xs">Expires</p>
                  <p className="font-semibold mt-0.5 text-sm text-slate-900">
                    {new Date(active.expires_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {cancelError && (
                <p className="text-red-600 text-xs text-center mb-2">{cancelError}</p>
              )}

              <button
                onClick={() => handleCancel(active.id)}
                disabled={cancelling}
                className="w-full bg-white border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
              >
                {cancelling ? "Cancelling…" : "Cancel Reservation"}
              </button>
            </div>
          )}
        </>
      )}

      {/* History */}
      {!hl && history?.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Recent Reservations
          </h3>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.station_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r.fuel_name} · {parseFloat(r.amount_l)} L · #{r.queue_number}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[r.status] || STATUS_STYLES.active}`}>
                    {r.status}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

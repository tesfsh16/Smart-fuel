import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getQueue, confirmFuelled } from "../../api/station";

export default function StationQueue() {
  const { data, loading, error, refetch } = useApi(getQueue);
  const [confirming, setConfirming] = useState(null); // reservation id being confirmed
  const [confirmErr, setConfirmErr] = useState("");

  async function handleConfirm(reservationId) {
    setConfirming(reservationId);
    setConfirmErr("");
    try {
      await confirmFuelled(reservationId);
      refetch();
    } catch (err) {
      setConfirmErr(err.message || "Confirmation failed.");
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Queue" subtitle="Live queue — vehicles currently waiting" />

      <div className="p-6">
        {loading && <div className="text-center text-slate-400 text-sm py-12">Loading queue…</div>}
        {error   && <div className="text-center text-red-600 text-sm py-12">{error}</div>}

        {confirmErr && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm mb-4">{confirmErr}</div>
        )}

        {!loading && !error && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">
                {data?.length || 0} vehicle{data?.length !== 1 ? "s" : ""} waiting
              </p>
              <button
                onClick={refetch}
                className="text-xs text-slate-600 border border-slate-200 bg-white px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Refresh
              </button>
            </div>

            {data?.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
                Queue is empty.
              </div>
            ) : (
              <div className="space-y-3">
                {data.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${
                      idx === 0 ? "border-slate-400 ring-1 ring-slate-200" : "border-slate-200"
                    }`}
                  >
                    {/* Position badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                      idx === 0 ? "text-white" : "bg-slate-100 text-slate-600"
                    }`} style={idx === 0 ? { background: "#1e3a5f" } : {}}>
                      {entry.position}
                    </div>

                    {/* Driver info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900">{entry.driver_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {entry.plate_number && <span className="font-mono mr-2">{entry.plate_number}</span>}
                        {entry.fuel_name} · {parseFloat(entry.amount_l)} L
                      </p>
                    </div>

                    {/* Queue number + code */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-900 font-mono">#{entry.queue_number}</p>
                      <p className="text-xs font-mono text-slate-400">{entry.code}</p>
                    </div>

                    {/* Confirm button — shown for all entries */}
                    <button
                      onClick={() => handleConfirm(entry.reservation_id ?? entry.id)}
                      disabled={confirming === (entry.reservation_id ?? entry.id)}
                      className="flex-shrink-0 text-xs font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-60"
                      style={{ background: "#1e3a5f" }}
                      title="Confirm driver received fuel"
                    >
                      {confirming === (entry.reservation_id ?? entry.id) ? "…" : "Confirm Fuelled"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

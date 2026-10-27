import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { distributorGetRequests, distributorFulfil } from "../../api/supply";

const STATUS_LABELS = {
  authority_approved: { label: "Ready to dispatch", color: "text-blue-600"   },
  in_delivery:        { label: "In delivery",       color: "text-indigo-600" },
  fulfilled:          { label: "Fulfilled",         color: "text-green-600"  },
};

export default function SupplyRequests() {
  const { data: requests, loading, error, refetch } = useApi(distributorGetRequests);
  const [scheduling, setScheduling] = useState(null); // request id
  const [schedDate,  setSchedDate]  = useState("");
  const [busy,       setBusy]       = useState(false);
  const [msg,        setMsg]        = useState("");

  async function handleFulfil(requestId) {
    setBusy(true); setMsg("");
    try {
      const scheduledAt = schedDate ? new Date(schedDate).toISOString() : undefined;
      const r = await distributorFulfil(requestId, scheduledAt);
      setMsg(`Delivery #${r.deliveryId} created. The station will be notified.`);
      setScheduling(null);
      setSchedDate("");
      refetch();
    } catch (err) {
      setMsg(err.message || "Failed to create delivery.");
    } finally {
      setBusy(false);
    }
  }

  const approved = (requests || []).filter(r => r.status === "authority_approved");
  const others   = (requests || []).filter(r => r.status !== "authority_approved");

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Supply Requests" subtitle="Authority-approved requests waiting for dispatch" />

      <div className="p-6 space-y-6">
        {loading && <div className="text-center text-slate-400 text-sm py-10">Loading…</div>}
        {error   && <div className="text-center text-red-600 text-sm py-10">{error}</div>}

        {msg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">{msg}</div>
        )}

        {/* Approved — ready to dispatch */}
        {approved.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Ready to dispatch ({approved.length})
            </h2>
            <div className="space-y-3">
              {approved.map(r => (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{r.station_name}</p>
                      <p className="text-xs text-slate-400">{r.station_region}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">Ready to dispatch</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Fuel</p>
                      <p className="font-semibold text-slate-800">{r.fuel_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Approved qty</p>
                      <p className="font-semibold text-slate-800">
                        {parseFloat(r.authority_approved_quantity || r.quantity).toLocaleString()} L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Requested</p>
                      <p className="font-semibold text-slate-800">{parseFloat(r.quantity).toLocaleString()} L</p>
                    </div>
                  </div>

                  {scheduling === r.id ? (
                    <div className="border-t border-slate-100 pt-3 space-y-3">
                      <label className="block text-xs font-semibold text-slate-700">
                        Scheduled delivery date & time
                        <input
                          type="datetime-local"
                          value={schedDate}
                          onChange={e => setSchedDate(e.target.value)}
                          className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                        />
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFulfil(r.id)}
                          disabled={busy}
                          className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-60"
                          style={{ background: "#1e3a5f" }}
                        >
                          {busy ? "Creating…" : "Create Delivery"}
                        </button>
                        <button
                          onClick={() => setScheduling(null)}
                          className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setScheduling(r.id)}
                      className="w-full py-2.5 text-sm font-semibold text-white rounded-xl"
                      style={{ background: "#1e3a5f" }}
                    >
                      Schedule Delivery
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {others.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Dispatched / Fulfilled
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Station", "Fuel", "Qty (L)", "Delivery", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {others.map(r => {
                    const st = STATUS_LABELS[r.status] || { label: r.status, color: "text-slate-600" };
                    return (
                      <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{r.station_name}</td>
                        <td className="px-4 py-3 text-slate-600">{r.fuel_name}</td>
                        <td className="px-4 py-3 text-slate-600">{parseFloat(r.authority_approved_quantity || r.quantity).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500 capitalize">
                          {r.delivery_id ? `#${r.delivery_id} · ${(r.delivery_status||"").replace("_"," ")}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {!loading && !error && requests?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
            No approved supply requests waiting for dispatch.
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import {
  getDeliveries,
  updateDeliveryStatus,
  reconcileDelivery,
} from "../../api/distributor";

const STATUS_STYLES = {
  scheduled:  { badge: "bg-slate-50 text-slate-600 border-slate-200",  dot: "bg-slate-400",  label: "Scheduled"   },
  in_transit: { badge: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500",   label: "In Transit"  },
  completed:  { badge: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500",  label: "Completed"   },
  cancelled:  { badge: "bg-red-50 text-red-600 border-red-200",        dot: "bg-red-500",    label: "Cancelled"   },
};

const STATUS_TABS = ["all", "scheduled", "in_transit", "completed", "cancelled"];

// Reconciliation panel — enter received quantities per fuel item.
function ReconcilePanel({ delivery, onDone, onClose }) {
  const items = Array.isArray(delivery.items) ? delivery.items : [];
  const [qtys, setQtys] = useState(
    Object.fromEntries(items.map(i => [i.fuelCode, i.expectedQuantity ?? ""]))
  );
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await reconcileDelivery(
        delivery.id,
        Object.entries(qtys).map(([fuelCode, receivedQuantity]) => ({
          fuelCode,
          receivedQuantity: parseFloat(receivedQuantity),
        }))
      );
      onDone();
    } catch (err) {
      setError(err.message || "Reconciliation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Reconcile Delivery</h3>
          <button onClick={onClose} className="text-slate-400 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Enter the actual quantity received at <strong>{delivery.station_name}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {items.map(item => (
            <label key={item.fuelCode} className="block text-xs font-semibold text-slate-700">
              {item.fuelName} — expected: {parseFloat(item.expectedQuantity).toLocaleString()} L
              <input
                type="number"
                min="0"
                value={qtys[item.fuelCode] ?? ""}
                onChange={e => setQtys(q => ({ ...q, [item.fuelCode]: e.target.value }))}
                className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                placeholder="Received litres"
              />
            </label>
          ))}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-70"
            >
              {busy ? "Saving…" : "Confirm Receipt"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DistDeliveries() {
  const { data: deliveries, loading, error, refetch } = useApi(getDeliveries);
  const [tab, setTab]             = useState("all");
  const [reconciling, setReconc]  = useState(null);
  const [actionBusy, setActionBusy] = useState(null);

  const filtered = (deliveries || []).filter(
    d => tab === "all" || d.status === tab
  );

  async function handleStatusChange(delivery, status) {
    setActionBusy(delivery.id);
    try {
      await updateDeliveryStatus(delivery.id, status);
      refetch();
    } catch (err) {
      alert(err.message || "Update failed.");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Deliveries" subtitle="Track and manage all fuel deliveries" />

      {reconciling && (
        <ReconcilePanel
          delivery={reconciling}
          onDone={() => { setReconc(null); refetch(); }}
          onClose={() => setReconc(null)}
        />
      )}

      <div className="p-6 space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border capitalize transition-colors ${
                tab === s
                  ? "bg-blue-700 text-white border-blue-700"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-slate-400 text-sm py-16">Loading deliveries…</div>}
        {error   && <div className="text-center text-red-600 text-sm py-16">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm">
            No deliveries found.
          </div>
        )}

        {!loading && !error && filtered.map(d => {
          const s    = STATUS_STYLES[d.status] || STATUS_STYLES.scheduled;
          const items = Array.isArray(d.items) ? d.items : [];
          const hasDiscrepancy = items.some(i => i.itemStatus === "discrepancy");
          const isBusy = actionBusy === d.id;

          return (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-bold text-slate-900">{d.station_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{d.station_region}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {items.map((item, idx) => {
                  const recv = item.receivedQuantity != null ? parseFloat(item.receivedQuantity) : null;
                  const exp  = parseFloat(item.expectedQuantity);
                  const diff = recv != null ? recv - exp : null;
                  return (
                    <div key={idx} className={`rounded-lg p-3 border ${item.itemStatus === "discrepancy" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-100"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-800">{item.fuelName}</p>
                        {item.itemStatus !== "pending" && (
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                            item.itemStatus === "discrepancy"
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}>
                            {item.itemStatus}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-slate-500">
                        <span>Expected: <strong className="text-slate-800">{exp.toLocaleString()} L</strong></span>
                        {recv != null && (
                          <span>Received: <strong className={diff < 0 ? "text-red-600" : "text-slate-800"}>{recv.toLocaleString()} L</strong></span>
                        )}
                        {diff != null && Math.abs(diff) > 0 && (
                          <span className="text-red-600 font-semibold">Δ {diff > 0 ? "+" : ""}{diff.toLocaleString()} L</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 text-xs text-slate-500">
                {[
                  { l: "Scheduled",  v: d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : "—" },
                  { l: "Departed",   v: d.departed_at  ? new Date(d.departed_at).toLocaleString()  : "—" },
                  { l: "Arrived",    v: d.arrived_at   ? new Date(d.arrived_at).toLocaleString()   : "—" },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">{l}</p>
                    <p className="font-medium text-slate-700">{v}</p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {d.status === "scheduled" && (
                  <button
                    onClick={() => handleStatusChange(d, "in_transit")}
                    disabled={isBusy}
                    className="text-xs font-semibold bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    {isBusy ? "Updating…" : "Mark In Transit"}
                  </button>
                )}
                {d.status === "in_transit" && (
                  <button
                    onClick={() => setReconc(d)}
                    className="text-xs font-semibold bg-green-600 text-white px-4 py-2 rounded-lg"
                  >
                    Reconcile Receipt
                  </button>
                )}
                {(d.status === "scheduled" || d.status === "in_transit") && (
                  <button
                    onClick={() => handleStatusChange(d, "cancelled")}
                    disabled={isBusy}
                    className="text-xs font-semibold bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg disabled:opacity-60"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

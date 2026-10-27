import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { authorityGetRequests, authorityReview } from "../../api/supply";

const STATUS_LABELS = {
  pending:            { label: "Pending review",    color: "text-amber-600"  },
  authority_approved: { label: "Approved",          color: "text-blue-600"   },
  authority_rejected: { label: "Rejected",          color: "text-red-600"    },
  in_delivery:        { label: "In delivery",       color: "text-indigo-600" },
  fulfilled:          { label: "Fulfilled",         color: "text-green-600"  },
};

function ReviewModal({ request, onDone, onClose }) {
  const [action, setAction]   = useState("approve");
  const [adjQty, setAdjQty]   = useState(parseFloat(request.quantity));
  const [notes, setNotes]     = useState("");
  const [busy,  setBusy]      = useState(false);
  const [err,   setErr]       = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      await authorityReview(request.id, {
        action,
        approvedQuantity: action === "approve" ? adjQty : undefined,
        notes: notes || undefined,
      });
      onDone();
    } catch (e) {
      setErr(e.message || "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900">Review Request</h3>
          <button onClick={onClose} className="text-slate-400 text-xl">×</button>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 mb-4 text-sm space-y-1">
          <p><span className="text-slate-400">Station:</span> <strong>{request.station_name}</strong></p>
          <p><span className="text-slate-400">Fuel:</span> {request.fuel_name}</p>
          <p><span className="text-slate-400">Requested:</span> {parseFloat(request.quantity).toLocaleString()} L</p>
          {request.notes && <p><span className="text-slate-400">Notes:</span> {request.notes}</p>}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            {["approve","reject"].map(a => (
              <button key={a} type="button" onClick={() => setAction(a)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors capitalize ${
                  action === a ? "text-white border-transparent" : "bg-white text-slate-600 border-slate-200"
                }`}
                style={action === a ? { background: a === "approve" ? "#1e3a5f" : "#dc2626" } : {}}
              >{a}</button>
            ))}
          </div>

          {action === "approve" && (
            <label className="block text-xs font-semibold text-slate-700">
              Approved quantity (L) — you can reduce this
              <input type="number" min="1" max={request.quantity} value={adjQty}
                onChange={e => setAdjQty(parseFloat(e.target.value))}
                className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400" />
            </label>
          )}

          <label className="block text-xs font-semibold text-slate-700">
            Notes (optional)
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
              placeholder="Reason for decision" />
          </label>

          {err && <p className="text-xs text-red-600">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: action === "approve" ? "#1e3a5f" : "#dc2626" }}>
              {busy ? "Saving…" : action === "approve" ? "Approve" : "Reject"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SupplyReview() {
  const { data: requests, loading, error, refetch } = useApi(authorityGetRequests);
  const [reviewing, setReviewing] = useState(null);

  const pending = (requests||[]).filter(r => r.status === "pending");
  const others  = (requests||[]).filter(r => r.status !== "pending");

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Supply Requests" subtitle="Review station fuel requests" />

      {reviewing && (
        <ReviewModal
          request={reviewing}
          onDone={() => { setReviewing(null); refetch(); }}
          onClose={() => setReviewing(null)}
        />
      )}

      <div className="p-6 space-y-6">
        {loading && <div className="text-center text-slate-400 text-sm py-10">Loading…</div>}
        {error   && <div className="text-center text-red-600 text-sm py-10">{error}</div>}

        {/* Pending */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Awaiting review ({pending.length})
            </h2>
            <div className="space-y-3">
              {pending.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-semibold text-slate-900">{r.station_name}</p>
                      <p className="text-xs text-slate-400">{r.station_region} · {new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setReviewing(r)}
                      className="text-sm font-semibold px-4 py-1.5 rounded-xl text-white flex-shrink-0"
                      style={{ background: "#1e3a5f" }}>
                      Review
                    </button>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <span className="text-slate-500">Fuel: <strong className="text-slate-800">{r.fuel_name}</strong></span>
                    <span className="text-slate-500">Qty: <strong className="text-slate-800">{parseFloat(r.quantity).toLocaleString()} L</strong></span>
                  </div>
                  {r.notes && <p className="text-xs text-slate-400 mt-1.5">Note: {r.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* History */}
        {others.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">History</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {["Station","Fuel","Requested","Approved","Status","Date"].map(h => (
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
                        <td className="px-4 py-3 text-slate-600">{parseFloat(r.quantity).toLocaleString()} L</td>
                        <td className="px-4 py-3 text-slate-600">
                          {r.authority_approved_quantity ? `${parseFloat(r.authority_approved_quantity).toLocaleString()} L` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{new Date(r.authority_reviewed_at||r.created_at).toLocaleDateString()}</td>
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
            No supply requests yet.
          </div>
        )}
      </div>
    </div>
  );
}

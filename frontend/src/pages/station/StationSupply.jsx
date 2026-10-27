import { useState } from "react";
import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { stationCreateRequest, stationGetRequests } from "../../api/supply";

const STATUS_LABELS = {
  pending:              { label: "Pending",             color: "text-amber-600"  },
  authority_approved:   { label: "Authority Approved",  color: "text-blue-600"   },
  authority_rejected:   { label: "Rejected",            color: "text-red-600"    },
  in_delivery:          { label: "In Delivery",         color: "text-indigo-600" },
  fulfilled:            { label: "Fulfilled",           color: "text-green-600"  },
};

export default function StationSupply() {
  const { data: requests, loading, error, refetch } = useApi(stationGetRequests);
  const [showForm, setShowForm] = useState(false);
  const [form,  setForm]  = useState({ fuelCode: "PETROL", quantity: "", notes: "" });
  const [busy,  setBusy]  = useState(false);
  const [fErr,  setFErr]  = useState("");
  const [fOk,   setFOk]   = useState("");

  function setF(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.quantity || parseFloat(form.quantity) <= 0) {
      setFErr("Enter a valid quantity."); return;
    }
    setBusy(true); setFErr(""); setFOk("");
    try {
      await stationCreateRequest({ ...form, quantity: parseFloat(form.quantity) });
      setFOk("Request submitted. Waiting for authority review.");
      setForm({ fuelCode: "PETROL", quantity: "", notes: "" });
      setShowForm(false);
      refetch();
    } catch (err) {
      setFErr(err.message || "Failed to submit request.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400";

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Supply Requests" subtitle="Request fuel from the distributor" />

      <div className="p-6 space-y-4">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">{requests?.length || 0} request(s)</p>
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-sm font-semibold px-4 py-2 rounded-xl text-white"
            style={{ background: "#1e3a5f" }}
          >
            {showForm ? "Cancel" : "New Request"}
          </button>
        </div>

        {fOk && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">{fOk}</div>}

        {/* New request form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">New fuel supply request</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Fuel type
                <select value={form.fuelCode} onChange={setF("fuelCode")} className={inputCls}>
                  <option value="PETROL">Petrol</option>
                  <option value="DIESEL">Diesel</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Quantity (litres)
                <input type="number" min="1" value={form.quantity} onChange={setF("quantity")} className={inputCls} placeholder="e.g. 10000" />
              </label>
            </div>
            <label className="text-xs font-semibold text-slate-700">
              Notes (optional)
              <input type="text" value={form.notes} onChange={setF("notes")} className={inputCls} placeholder="Reason or urgency" />
            </label>
            {fErr && <p className="text-xs text-red-600">{fErr}</p>}
            <button type="submit" disabled={busy} className="text-sm font-semibold px-5 py-2 rounded-xl text-white disabled:opacity-60" style={{ background: "#1e3a5f" }}>
              {busy ? "Submitting…" : "Submit Request"}
            </button>
          </form>
        )}

        {loading && <div className="text-center text-slate-400 text-sm py-10">Loading…</div>}
        {error   && <div className="text-center text-red-600 text-sm py-10">{error}</div>}

        {!loading && !error && requests?.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-400 text-sm">
            No supply requests yet. Create one to request fuel.
          </div>
        )}

        {!loading && !error && requests?.map(r => {
          const st = STATUS_LABELS[r.status] || { label: r.status, color: "text-slate-600" };
          return (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{r.fuel_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Requested</p>
                  <p className="font-semibold text-slate-800">{parseFloat(r.quantity).toLocaleString()} L</p>
                </div>
                {r.authority_approved_quantity && (
                  <div>
                    <p className="text-xs text-slate-400">Approved qty</p>
                    <p className="font-semibold text-slate-800">{parseFloat(r.authority_approved_quantity).toLocaleString()} L</p>
                  </div>
                )}
                {r.distributor_name && (
                  <div>
                    <p className="text-xs text-slate-400">Distributor</p>
                    <p className="font-semibold text-slate-800">{r.distributor_name}</p>
                  </div>
                )}
                {r.delivery_id && (
                  <div>
                    <p className="text-xs text-slate-400">Delivery</p>
                    <p className="font-semibold text-slate-800 capitalize">{(r.delivery_status||"").replace("_"," ")}</p>
                  </div>
                )}
              </div>

              {r.notes && (
                <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  Note: {r.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

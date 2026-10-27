import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getDeliveries, getSupplyRequests } from "../../api/distributor";
import { useNavigate } from "react-router-dom";

const STATUS_STYLES = {
  scheduled:  { badge: "bg-slate-50 text-slate-600 border-slate-200",  dot: "bg-slate-400"  },
  in_transit: { badge: "bg-blue-50 text-blue-700 border-blue-200",     dot: "bg-blue-500"   },
  completed:  { badge: "bg-green-50 text-green-700 border-green-200",  dot: "bg-green-500"  },
  cancelled:  { badge: "bg-red-50 text-red-600 border-red-200",        dot: "bg-red-500"    },
};

const SR_STATUS_STYLES = {
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-blue-50 text-blue-700 border-blue-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  fulfilled: "bg-green-50 text-green-700 border-green-200",
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DistDashboard() {
  const delApi = useApi(getDeliveries);
  const srApi  = useApi(getSupplyRequests);
  const navigate = useNavigate();

  const deliveries = delApi.data || [];
  const requests   = srApi.data  || [];

  const scheduled  = deliveries.filter(d => d.status === "scheduled").length;
  const inTransit  = deliveries.filter(d => d.status === "in_transit").length;
  const pendingSR  = requests.filter(r => r.status === "pending").length;

  const loading = delApi.loading || srApi.loading;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Distributor Dashboard" subtitle="Supply and delivery overview" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Deliveries" value={deliveries.length} />
          <StatCard label="Scheduled"    value={scheduled}  sub="pending dispatch" />
          <StatCard label="In Transit"   value={inTransit}  sub="currently moving" />
          <StatCard label="Supply Requests" value={pendingSR} sub="awaiting action" />
        </div>

        {/* Recent deliveries */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Recent Deliveries</h2>
            <button
              onClick={() => navigate("/distributor/deliveries")}
              className="text-xs text-blue-700 font-medium"
            >
              View all →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Station", "Fuel", "Qty (L)", "Scheduled", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 5).map(d => {
                  const s = STATUS_STYLES[d.status] || STATUS_STYLES.scheduled;
                  const items = Array.isArray(d.items) ? d.items : [];
                  return (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{d.station_name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {items.map(i => i.fuelName).join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {items.reduce((sum, i) => sum + parseFloat(i.expectedQuantity || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {d.scheduled_at ? new Date(d.scheduled_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${s.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {d.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending supply requests */}
        {pendingSR > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Pending Supply Requests
              </h2>
              <button
                onClick={() => navigate("/distributor/supply")}
                className="text-xs text-blue-700 font-medium"
              >
                View all →
              </button>
            </div>
            <div className="space-y-2">
              {requests.filter(r => r.status === "pending").map(r => (
                <div key={r.id} className="bg-white border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{r.station_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.fuel_name} · {parseFloat(r.quantity).toLocaleString()} L
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${SR_STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

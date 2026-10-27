import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getDeliveries } from "../../api/station";

const STATUS_STYLES = {
  scheduled:   "bg-slate-50 text-slate-600 border-slate-200",
  in_transit:  "bg-blue-50 text-blue-700 border-blue-200",
  completed:   "bg-green-50 text-green-700 border-green-200",
  cancelled:   "bg-red-50 text-red-600 border-red-200",
};

const ITEM_STATUS_STYLES = {
  pending:     "bg-slate-50 text-slate-500 border-slate-200",
  received:    "bg-green-50 text-green-700 border-green-200",
  discrepancy: "bg-red-50 text-red-600 border-red-200",
};

export default function StationDeliveries() {
  const { data, loading, error } = useApi(getDeliveries);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Deliveries" subtitle="Expected and completed fuel deliveries" />

      <div className="p-6">
        {loading && (
          <div className="text-center text-slate-400 text-sm py-12">Loading deliveries…</div>
        )}
        {error && (
          <div className="text-center text-red-600 text-sm py-12">{error}</div>
        )}

        {!loading && !error && data?.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
            No deliveries found.
          </div>
        )}

        {!loading && !error && data?.length > 0 && (
          <div className="space-y-4">
            {data.map(d => {
              const hasDiff = d.received_quantity !== null && d.received_quantity !== d.expected_quantity;
              const diff = hasDiff ? parseFloat(d.received_quantity) - parseFloat(d.expected_quantity) : null;

              return (
                <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="font-semibold text-slate-900 text-base">{d.distributor_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : "—"}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize flex-shrink-0 ${STATUS_STYLES[d.status] || STATUS_STYLES.scheduled}`}>
                      {d.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Fuel</p>
                      <p className="font-semibold text-slate-800">{d.fuel_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Expected</p>
                      <p className="font-semibold text-slate-800">
                        {parseFloat(d.expected_quantity).toLocaleString()} L
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Received</p>
                      <p className={`font-semibold ${hasDiff ? "text-red-600" : "text-slate-800"}`}>
                        {d.received_quantity !== null
                          ? `${parseFloat(d.received_quantity).toLocaleString()} L`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Item status</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ITEM_STATUS_STYLES[d.item_status] || ITEM_STATUS_STYLES.pending}`}>
                        {d.item_status}
                      </span>
                    </div>
                  </div>

                  {hasDiff && (
                    <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                      <span>⚠️</span>
                      <span>
                        Discrepancy: {diff > 0 ? "+" : ""}{diff?.toLocaleString()} L
                        ({parseFloat(d.expected_quantity).toLocaleString()} L expected,{" "}
                        {parseFloat(d.received_quantity).toLocaleString()} L received)
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

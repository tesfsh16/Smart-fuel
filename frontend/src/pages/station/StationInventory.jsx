import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getInventory, getMovements } from "../../api/station";

const RISK_STYLES = {
  LOW:      { bar: "bg-green-500",  text: "text-green-600"  },
  HIGH:     { bar: "bg-amber-500",  text: "text-amber-600"  },
  CRITICAL: { bar: "bg-red-500",    text: "text-red-600"    },
};

const MOVE_STYLES = {
  receiving:           { icon: "↓", cls: "text-green-600 bg-green-50" },
  sale:                { icon: "↑", cls: "text-red-600 bg-red-50"     },
  adjustment:          { icon: "≈", cls: "text-blue-600 bg-blue-50"   },
  reservation_hold:    { icon: "⊘", cls: "text-amber-600 bg-amber-50" },
  reservation_release: { icon: "↺", cls: "text-slate-600 bg-slate-50" },
};

export default function StationInventory() {
  const invApi  = useApi(getInventory);
  const moveApi = useApi(getMovements);

  const loading = invApi.loading || moveApi.loading;
  const error   = invApi.error   || moveApi.error;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading inventory…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar title="Inventory" subtitle="Current stock levels and movement history" />

      <div className="p-6 space-y-6">
        {/* Stock levels */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Stock Levels
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {invApi.data?.map(item => {
              const s = RISK_STYLES[item.riskLevel] || RISK_STYLES.LOW;
              return (
                <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-slate-800 text-base">{item.fuelName}</p>
                    <span className={`text-xs font-semibold ${s.text}`}>{item.riskLevel}</span>
                  </div>

                  <p className="text-3xl font-bold text-slate-900 mb-1">
                    {item.quantity.toLocaleString()} L
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    Capacity: {item.capacity.toLocaleString()} L
                  </p>

                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full ${s.bar} rounded-full transition-all`}
                      style={{ width: `${item.percentFull}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{item.percentFull}% full</span>
                    <span>Updated {new Date(item.updatedAt).toLocaleTimeString()}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Low threshold</p>
                      <p className="font-semibold text-slate-700">{item.thresholdLow.toLocaleString()} L</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Critical threshold</p>
                      <p className="font-semibold text-slate-700">{item.thresholdCritical.toLocaleString()} L</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Movement history */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Recent Movements
          </h2>
          {(!moveApi.data || moveApi.data.length === 0) ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No movements recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fuel</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty (L)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {moveApi.data.map(m => {
                    const ms = MOVE_STYLES[m.movement_type] || MOVE_STYLES.adjustment;
                    const sign = m.quantity >= 0 ? "+" : "";
                    return (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ms.cls}`}>
                            <span>{ms.icon}</span>
                            {m.movement_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{m.fuel_name}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                          {sign}{parseFloat(m.quantity).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500">
                          {parseFloat(m.balance_after).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{m.created_by || "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

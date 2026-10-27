import TopBar from "../../components/TopBar";
import { useApi } from "../../hooks/useApi";
import { getDashboard } from "../../api/station";

const RISK_STYLES = {
  LOW:      { bar: "bg-green-500",  text: "text-green-600"  },
  HIGH:     { bar: "bg-amber-500",  text: "text-amber-600"  },
  CRITICAL: { bar: "bg-red-500",    text: "text-red-600"    },
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

function StockCard({ fuelName, stock }) {
  const pct = Math.min(100, Math.round((stock.quantity / stock.capacity) * 100));
  const s = RISK_STYLES[stock.riskLevel] || RISK_STYLES.LOW;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-slate-800">{fuelName}</p>
        <span className={`text-xs font-semibold ${s.text}`}>{stock.riskLevel}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">
        {stock.quantity.toLocaleString()} L
      </p>
      <p className="text-xs text-slate-400 mb-3">
        Capacity: {stock.capacity.toLocaleString()} L
      </p>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${s.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-slate-400 mt-1.5 text-right">{pct}% full</p>
    </div>
  );
}

function AlertBar({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div className="space-y-2 mb-6">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`px-4 py-3 rounded-lg text-sm font-medium border ${
            a.type === "critical"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}

export default function StationDashboard() {
  const { data, loading, error, refetch } = useApi(getDashboard);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">{error}</p>
          <button onClick={refetch} className="text-sm text-blue-700 underline">Retry</button>
        </div>
      </div>
    );
  }

  const d = data;
  const nextDel = d.nextDelivery;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <TopBar
        title={d.station.name}
        subtitle={`${d.station.region} · ${d.station.address}`}
      />

      <div className="p-6 space-y-6">
        <AlertBar alerts={d.alerts} />

        {/* Stock cards */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Current Stock
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(d.inventory).map(([code, stock]) => (
              <StockCard
                key={code}
                fuelName={code.charAt(0).toUpperCase() + code.slice(1)}
                stock={stock}
              />
            ))}
          </div>
        </section>

        {/* Stats row */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Today
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Sales" value={`${d.todaysSalesL.toLocaleString()} L`} sub="fuel dispensed today" />
            <StatCard label="Reservations" value={d.activeReservations} sub="active" />
            <StatCard label="Queue" value={d.queueCount} sub="vehicles waiting" />
          </div>
        </section>

        {/* Next delivery */}
        {nextDel && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Next Delivery
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center gap-4 justify-between">
              <div>
                  <p className="font-semibold text-slate-800">
                    {nextDel.fuelName} — {nextDel.expectedQuantity.toLocaleString()} L
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(nextDel.scheduledAt).toLocaleString()}
                  </p>
              </div>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize
                ${nextDel.status === "in_transit"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-50 text-slate-600 border-slate-200"
                }`}>
                {nextDel.status.replace("_", " ")}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

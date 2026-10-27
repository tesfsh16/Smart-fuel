import { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createReservation } from "../../api/driver";

const FUEL_OPTIONS = ["PETROL", "DIESEL"];

export default function Reserve() {
  const location = useLocation();
  const navigate  = useNavigate();

  // Try router state first; fall back to sessionStorage which is set when
  // an unauthenticated user clicks Reserve on a station card.
  const station = useMemo(() => {
    if (location.state?.station) return location.state.station;
    try {
      const saved = sessionStorage.getItem("smartfuel_pending_station");
      if (saved) {
        // Keep it in storage until we successfully build the page —
        // we only remove it once the form is shown, not on every render
        return JSON.parse(saved);
      }
    } catch { /* ignore */ }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [fuelCode,     setFuelCode]     = useState(
    station ? Object.keys(station.fuels)[0].toUpperCase() : "PETROL"
  );
  const [amountL,      setAmountL]      = useState("");
  const [plateNumber,  setPlateNumber]  = useState("");
  const [vehicleType,  setVehicleType]  = useState("Car");
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState("");
  const [confirmation, setConfirmation] = useState(null);

  if (!station) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-500 text-sm mb-3">No station selected.</p>
        <button
          onClick={() => navigate("/driver")}
          className="text-blue-700 text-sm font-semibold underline"
        >
          Go back to Find Fuel
        </button>
      </div>
    );
  }

  const fuelInfo = station.fuels[fuelCode.toLowerCase()];

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!amountL || parseFloat(amountL) <= 0) {
      setError("Enter a valid fuel amount.");
      return;
    }
    setBusy(true);
    try {
      const res = await createReservation({
        stationId:  station.id,
        fuelCode,
        amountL:    parseFloat(amountL),
        plateNumber: plateNumber || undefined,
        vehicleType: vehicleType || undefined,
      });
      // Clear the pending station now that we're done with it
      sessionStorage.removeItem("smartfuel_pending_station");
      setConfirmation(res);
    } catch (err) {
      setError(err.message || "Reservation failed.");
    } finally {
      setBusy(false);
    }
  }

  // Confirmation screen
  if (confirmation) {
    return (
      <div className="p-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center mb-4">
          <h2 className="text-lg font-bold text-green-800 mb-1">Reservation Confirmed</h2>
          <p className="text-green-700 text-sm">{confirmation.station_name}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 mb-4">
          {[
            { l: "Queue number",  v: `#${confirmation.queue_number}` },
            { l: "Code",          v: confirmation.code },
            { l: "Fuel",          v: confirmation.fuel_name },
            { l: "Amount",        v: `${parseFloat(confirmation.amount_l)} L` },
            { l: "Valid until",   v: new Date(confirmation.expires_at).toLocaleTimeString() },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between items-center text-sm border-b border-slate-50 pb-2 last:border-0 last:pb-0">
              <span className="text-slate-500">{l}</span>
              <span className="font-bold text-slate-900 font-mono">{v}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center mb-5">
          Show this code at the station. Arrive before the reservation expires.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate("/driver/queue")}
            className="flex-1 bg-blue-700 text-white rounded-xl py-2.5 text-sm font-bold"
          >
            View My Queue
          </button>
          <button
            onClick={() => navigate("/driver")}
            className="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl py-2.5 text-sm font-semibold"
          >
            Find More Fuel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <button
        onClick={() => navigate("/driver")}
        className="flex items-center gap-1 text-blue-700 text-sm font-medium mb-4"
      >
        ← Back
      </button>

      <h2 className="text-lg font-bold text-slate-900 mb-0.5">Reserve Fuel</h2>
      <p className="text-xs text-slate-500 mb-5">{station.name} · {station.address}</p>

      {/* Fuel availability preview */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {Object.values(station.fuels).map(f => (
          <div key={f.fuelCode} className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xs font-semibold text-slate-600 mb-1">{f.fuelName}</p>
            <p className="text-base font-bold text-slate-900">{f.quantity.toLocaleString()} L</p>
            <p className="text-[10px] text-slate-400">{f.percentFull}% remaining</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fuel type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Fuel type
          </label>
          <div className="flex gap-2">
            {FUEL_OPTIONS.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFuelCode(f)}
                disabled={!station.fuels[f.toLowerCase()]}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                  fuelCode === f
                    ? "text-white border-[#1e3a5f]"
                    : "bg-white text-slate-600 border-slate-200"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                style={fuelCode === f ? { background: "#1e3a5f" } : {}}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {fuelInfo && (
          <p className="text-xs text-slate-400">
            Available: {fuelInfo.quantity.toLocaleString()} L
          </p>
        )}

        {/* Amount */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Amount (litres)
          </label>
          <input
            type="number"
            min="1"
            max="200"
            value={amountL}
            onChange={e => setAmountL(e.target.value)}
            placeholder="e.g. 20"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* Plate */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Plate number <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={plateNumber}
            onChange={e => setPlateNumber(e.target.value)}
            placeholder="e.g. 3-12345 A.A"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full text-white rounded-xl py-3 text-sm font-bold disabled:opacity-70"
          style={{ background: "#1e3a5f" }}
        >
          {busy ? "Reserving…" : "Confirm Reservation"}
        </button>
      </form>
    </div>
  );
}

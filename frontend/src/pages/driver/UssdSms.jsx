export default function UssdSms() {
  const steps = [
    { step: "Dial", value: "*123#", desc: "Open USSD menu" },
    { step: "Select", value: "3 → Reserve Fuel", desc: "Navigate to reservation" },
    { step: "Choose fuel", value: "1 = Petrol  2 = Diesel", desc: "Pick your fuel type" },
    { step: "Pick station", value: "1–3 from list", desc: "Select nearest available station" },
    { step: "Enter amount", value: "e.g. 20", desc: "Litres you want to reserve" },
    { step: "Confirm", value: "1 to confirm", desc: "Receive your queue code by SMS" },
  ];

  return (
    <div className="p-4 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">USSD / SMS Access</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Reserve fuel without mobile data — works on any phone
        </p>
      </div>

      {/* Coming soon banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div>
          <p className="text-sm font-semibold text-amber-800">Coming soon</p>
          <p className="text-xs text-amber-700 mt-0.5">
            USSD and SMS integration requires a telecom provider agreement.
            The design below shows the intended flow.
          </p>
        </div>
      </div>

      {/* USSD flow */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          USSD Flow
        </h3>
        <div className="space-y-2">
          {steps.map(({ step, value, desc }, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">{step}</p>
                <p className="text-sm font-semibold text-slate-900 font-mono">{value}</p>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SMS shortcode */}
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          SMS Shortcode
        </h3>
        <div className="bg-slate-900 text-green-400 rounded-xl p-4 font-mono text-sm space-y-2">
          <p className="text-slate-500 text-xs">Send to: <span className="text-white">9090</span></p>
          <p>FUEL PETROL 20</p>
          <div className="border-t border-slate-700 pt-2 text-xs text-slate-400 space-y-0.5">
            <p>→ Reservation confirmed</p>
            <p>→ Station: Bole Station A</p>
            <p>→ Queue: #47   Code: SF4821</p>
            <p>→ Valid until: 10:30</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Exact shortcode and syntax will be confirmed with the telecom provider.
        </p>
      </section>
    </div>
  );
}

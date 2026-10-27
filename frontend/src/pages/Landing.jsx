import { useNavigate } from "react-router-dom";

const portals = [
  {
    title: "Driver Portal",
    desc:  "Find nearby stations, check availability, reserve fuel and track your queue position in real time.",
    path:  "/driver",
    tag:   "Public access",
  },
  {
    title: "Station Portal",
    desc:  "Manage inventory levels, reservations, live queue and incoming deliveries from a dedicated workspace.",
    path:  "/station",
    tag:   "Station staff",
  },
  {
    title: "Government Dashboard",
    desc:  "National fuel intelligence — stock overview, shortage predictions and anomaly detection across all stations.",
    path:  "/government",
    tag:   "Restricted access",
  },
  {
    title: "Distributor Portal",
    desc:  "Schedule and track deliveries, reconcile received quantities and manage station supply requests.",
    path:  "/distributor",
    tag:   "Distributor staff",
  },
];

const features = [
  { title: "Real-time availability",  desc: "Drivers see live fuel levels and queue depth before they leave home."        },
  { title: "Virtual queue",           desc: "Reserve a slot and arrive when it's your turn — no more waiting in line."    },
  { title: "Station operations",      desc: "Every station gets its own secure portal for inventory and queue management." },
  { title: "Supply chain visibility", desc: "Distributors track deliveries from dispatch to confirmed receipt."            },
  { title: "Shortage prediction",     desc: "Rule-based AI flags stations approaching critical stock levels early."        },
  { title: "Anomaly detection",       desc: "Unusual sales volumes and delivery discrepancies are flagged for review."     },
];

// Arrow icon matching the provided image — dark navy, right-pointing
function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M5 12H19M19 12L13 6M19 12L13 18"
        stroke="#1e3a5f"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Nav ── */}
      <header className="bg-[#1e3a5f] px-8 md:px-16 h-16 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-black text-[#1e3a5f]">S</div>
          <span className="text-white font-extrabold text-base tracking-tight">SmartFuel Ethiopia</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="text-blue-200 text-sm font-medium hover:text-white">
            Sign in
          </button>
          <button onClick={() => navigate("/register")} className="bg-white text-[#1e3a5f] text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-slate-100">
            Register
          </button>
        </div>
      </header>

      {/* ── Hero ── softer blue gradient */}
      <section className="bg-gradient-to-b from-[#1e3a5f] to-[#2d5282] text-white px-8 md:px-16 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-100 mb-6 tracking-wide uppercase">
            Digital fuel infrastructure · Ethiopia
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Intelligent fuel access<br />
            <span className="text-blue-300">for every Ethiopian</span>
          </h1>
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
            SmartFuel connects drivers, fuel stations and distributors while giving authorized stakeholders real-time visibility into national fuel supply and demand.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/driver")}
              className="bg-white text-[#1e3a5f] font-bold px-6 py-3 rounded-xl text-sm hover:bg-slate-100"
            >
              Find Fuel Now
            </button>
            <button
              onClick={() => navigate("/register")}
              className="bg-white/10 border border-white/30 text-white font-bold px-6 py-3 rounded-xl text-sm hover:bg-white/20"
            >
              Create Driver Account
            </button>
          </div>
        </div>
      </section>

      {/* ── Features — no blue accent lines ── */}
      <section className="px-8 md:px-16 py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Everything the fuel ecosystem needs</h2>
          <p className="text-slate-500 text-center text-sm mb-10">One platform for drivers, stations, distributors and government.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Portals — image arrow ── */}
      <section className="px-8 md:px-16 py-16 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Choose your portal</h2>
          <p className="text-slate-500 text-center text-sm mb-10">Each role has a dedicated, secure workspace.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {portals.map(p => (
              <button
                key={p.path}
                onClick={() => navigate(p.path)}
                className="group text-left bg-white border border-slate-200 rounded-2xl p-6 hover:border-slate-400 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-base mb-1">{p.title}</p>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      {p.tag}
                    </span>
                  </div>
                  {/* Arrow matches the provided image */}
                  <span className="opacity-40 group-hover:opacity-100 transition-opacity mt-1">
                    <ArrowIcon />
                  </span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works banner ── (replaced demo scenario) */}
      <section className="px-8 md:px-16 py-12 bg-[#1e3a5f] text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl font-bold mb-3">How SmartFuel works</h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            A station experiences unusual demand. SmartFuel detects it, predicts the shortage risk, informs the station and authorized authorities, helps redirect drivers to alternative stations, and tracks replenishment until the situation is resolved.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-8 md:px-16 py-6 bg-slate-900 border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} SmartFuel Ethiopia. All rights reserved.</span>
          <div className="flex gap-6">
            <button onClick={() => navigate("/login")}    className="hover:text-slate-300">Sign in</button>
            <button onClick={() => navigate("/register")} className="hover:text-slate-300">Register</button>
            <button onClick={() => navigate("/driver")}   className="hover:text-slate-300">Find Fuel</button>
          </div>
        </div>
      </footer>

    </div>
  );
}

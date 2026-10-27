import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, homePathForUser } from "../contexts/AuthContext.jsx";

const demoAccounts = [
  { label: "Driver", email: "driver@demo.com" },
  { label: "Station Manager", email: "manager@demo.com" },
  { label: "Authority", email: "authority@demo.com" },
  { label: "Distributor", email: "distributor@demo.com" },
  { label: "Platform Admin", email: "admin@demo.com" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(homePathForUser(user), { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  function quickFill(demoEmail) {
    setEmail(demoEmail);
    setPassword("password123");
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left panel — branding (hidden on small screens) */}
      <div className="hidden md:flex flex-col justify-between px-12 py-14 text-white bg-blue-900">
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-lg">
              ⛽
            </div>
            <span className="font-extrabold text-lg">SmartFuel Ethiopia</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight mb-4 tracking-tight">
            Digital infrastructure for intelligent fuel access
          </h1>
          <p className="text-blue-200 text-[15px] leading-relaxed max-w-sm">
            Connects drivers, stations and distributors while giving authorized
            stakeholders intelligent visibility into fuel supply and demand.
          </p>
        </div>
        <div className="text-[11px] text-blue-300 tracking-wide uppercase">
          SmartFuel Ethiopia
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-col justify-center px-6 py-12 bg-white md:px-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile logo (hidden on desktop where the branding panel shows) */}
          <div className="flex items-center gap-2.5 mb-8 md:hidden">
            <div className="w-9 h-9 rounded-lg bg-blue-900 flex items-center justify-center text-lg">
              ⛽
            </div>
            <span className="font-extrabold text-lg text-slate-900">
              SmartFuel
            </span>
          </div>

          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 mb-6 inline-block">
            ← Back to home
          </Link>
          <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Sign in</h2>
          <p className="text-slate-500 text-[13px] mb-6">
            Use a demo account or your own credentials.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <label className="text-[13px] font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@demo.com"
                className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </label>
            <label className="text-[13px] font-semibold text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
              />
            </label>

            {error && (
              <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="bg-blue-700 text-white border-none rounded-lg py-2.5 px-4 text-sm font-semibold disabled:opacity-70"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-7">
            <div className="text-[11px] font-semibold tracking-wide uppercase text-slate-400 mb-2.5">
              Demo accounts (password: password123)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {demoAccounts.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => quickFill(a.email)}
                  className="text-xs border border-slate-200 bg-white rounded-full px-2.5 py-1 text-slate-600 hover:border-blue-300"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

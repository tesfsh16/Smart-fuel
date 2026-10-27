import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Register() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const from      = location.state?.from?.pathname || "/driver";

  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email)) {
      setError("Enter a valid email address (e.g. you@example.com).");
      return;
    }
    setBusy(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          email:    form.email,
          password: form.password,
          role:     "DRIVER",
        }),
      });
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen grid md:grid-cols-2">

      {/* Left branding panel — identical to Login */}
      <div
        className="hidden md:flex flex-col justify-between px-12 py-14 text-white"
        style={{ background: "#1e3a5f" }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-12">
            <img src="/favicon.svg" alt="SmartFuel" className="w-9 h-9 rounded-lg" />
            <span className="font-extrabold text-lg">SmartFuel Ethiopia</span>
          </div>
          <h1 className="text-3xl font-extrabold leading-tight mb-4 tracking-tight">
            Create your driver account
          </h1>
          <p className="text-blue-200 text-[15px] leading-relaxed max-w-sm">
            Register once, then find fuel stations, make reservations and
            track your queue — all from one place.
          </p>
        </div>
        <p className="text-[11px] text-blue-300 uppercase tracking-wide">
          SmartFuel Ethiopia
        </p>
      </div>

      {/* Right form panel — identical style to Login */}
      <div className="flex flex-col justify-center px-6 py-12 bg-white md:px-12">
        <div className="w-full max-w-sm mx-auto">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 md:hidden">
            <img src="/favicon.svg" alt="SmartFuel" className="w-9 h-9 rounded-lg" />
            <span className="font-extrabold text-lg text-slate-900">SmartFuel</span>
          </div>

          <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 mb-6 inline-block">
            ← Back to home
          </Link>

          <h2 className="text-2xl font-bold text-slate-900 mb-1.5">Create account</h2>
          <p className="text-slate-500 text-[13px] mb-6">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold" style={{ color: "#1e3a5f" }}>
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <label className="text-[13px] font-semibold text-slate-700">
              Full name
              <input
                type="text"
                value={form.fullName}
                onChange={set("fullName")}
                required
                minLength={2}
                placeholder="Abebe Tadesse"
                className={inputCls}
              />
            </label>

            <label className="text-[13px] font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={form.email}
                onChange={set("email")}
                required
                placeholder="you@example.com"
                className={inputCls}
              />
            </label>

            <label className="text-[13px] font-semibold text-slate-700">
              Password
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={inputCls}
              />
            </label>

            <label className="text-[13px] font-semibold text-slate-700">
              Confirm password
              <input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                required
                placeholder="Repeat your password"
                className={inputCls}
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
              className="text-white border-none rounded-lg py-2.5 px-4 text-sm font-semibold disabled:opacity-70"
              style={{ background: "#1e3a5f" }}
            >
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}

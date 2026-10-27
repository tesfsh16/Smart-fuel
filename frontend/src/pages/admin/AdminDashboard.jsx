import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { api } from "../../api/client.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import LocationPicker from "../../components/LocationPicker.jsx";

const getStats = () => api("/api/admin/stats");
const getUsers = () => api("/api/admin/users");

// ── Shared components ────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const ROLE_LABELS = {
  DRIVER:          "Driver",
  STATION_STAFF:   "Station Staff",
  STATION_MANAGER: "Station Manager",
  DISTRIBUTOR_USER:"Distributor",
  AUTHORITY:       "Authority",
  PLATFORM_ADMIN:  "Admin",
  CHAIN_ADMIN:     "Chain Admin",
};

const RES_STATUS_STYLES = {
  active:    "bg-green-50 text-green-700 border-green-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  expired:   "bg-slate-50 text-slate-500 border-slate-200",
  no_show:   "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Stats tab ────────────────────────────────────────────────────────────────

function StatsTab() {
  const { data, loading, error } = useApi(getStats);
  if (loading) return <div className="text-center text-slate-400 text-sm py-16">Loading…</div>;
  if (error)   return <div className="text-center text-red-600 text-sm py-16">{error}</div>;
  if (!data)   return null;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">User Registrations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Registered"  value={data.users.total}   sub="all accounts" />
          <StatCard label="Active Accounts"   value={data.users.active}  sub="status: active" />
          <StatCard label="Drivers"           value={data.users.drivers} sub="registered drivers" />
          <StatCard label="Registered Today"  value={data.users.today}   sub="new accounts today" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Reservations</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total"             value={data.reservations.total}     sub="all time" />
          <StatCard label="Reserved Today"    value={data.reservations.today}     sub="created today" />
          <StatCard label="Active"            value={data.reservations.active}    sub="currently active" />
          <StatCard label="Completed"         value={data.reservations.completed} sub="successfully fuelled" />
          <StatCard label="Cancelled"         value={data.reservations.cancelled} sub="cancelled by driver" />
          <StatCard label="Expired / No-show" value={data.reservations.expired + data.reservations.noShow} sub="expired or no-show" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Reservation Breakdown</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {[
            { label: "Active",    count: data.reservations.active,    status: "active"    },
            { label: "Completed", count: data.reservations.completed, status: "completed" },
            { label: "Cancelled", count: data.reservations.cancelled, status: "cancelled" },
            { label: "Expired",   count: data.reservations.expired,   status: "expired"   },
            { label: "No-show",   count: data.reservations.noShow,    status: "no_show"   },
          ].map(({ label, count, status }) => {
            const total = data.reservations.total || 1;
            const pct   = Math.round((count / total) * 100);
            return (
              <div key={status} className="flex items-center gap-4 px-5 py-3 border-b border-slate-50 last:border-0">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border w-24 text-center ${RES_STATUS_STYLES[status]}`}>
                  {label}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      status === "completed" ? "bg-blue-500" :
                      status === "active"    ? "bg-green-500" :
                      status === "cancelled" ? "bg-red-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-slate-900 w-8 text-right">{count}</span>
                <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Users by Role</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Users</th>
              </tr>
            </thead>
            <tbody>
              {data.roleBreakdown.map(r => (
                <tr key={r.role} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{ROLE_LABELS[r.role] || r.role}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recent Registrations</h2>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Name", "Email", "Status", "Registered"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                      u.status === "active" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-200"
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: users, loading, error, refetch } = useApi(getUsers);
  const [busy, setBusy] = useState(null);
  const [msg,  setMsg]  = useState("");

  async function toggle(user) {
    const newStatus = user.status === "active" ? "suspended" : "active";
    setBusy(user.id);
    setMsg("");
    try {
      await api(`/api/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setMsg(`${user.fullName} is now ${newStatus}.`);
      refetch();
    } catch (e) {
      setMsg(e.message || "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <div className="text-center text-slate-400 text-sm py-16">Loading users…</div>;
  if (error)   return <div className="text-center text-red-600 text-sm py-16">{error}</div>;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm">{msg}</div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Name", "Email", "Roles", "Status", "Action"].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-5 py-3 font-medium text-slate-900">{u.fullName}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">{u.email}</td>
                <td className="px-5 py-3 text-slate-500 text-xs">
                  {u.roles.map(r => ROLE_LABELS[r.role] || r.role).join(", ") || "—"}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    u.status === "active"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-red-50 text-red-600 border-red-200"
                  }`}>{u.status}</span>
                </td>
                <td className="px-5 py-3">
                  <button
                    onClick={() => toggle(u)}
                    disabled={busy === u.id}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border disabled:opacity-50 ${
                      u.status === "active"
                        ? "text-red-600 border-red-200 hover:bg-red-50"
                        : "text-green-700 border-green-200 hover:bg-green-50"
                    }`}
                  >
                    {busy === u.id ? "…" : u.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Register tab ──────────────────────────────────────────────────────────────

const ENTITY_TYPES = [
  { value: "station",     label: "Station"        },
  { value: "authority",   label: "Authority User"  },
  { value: "distributor", label: "Distributor"     },
];

function RegisterTab() {
  const [type,    setType]    = useState("station");
  const [form,    setForm]    = useState({});
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  function set(k) { return e => setForm(f => ({ ...f, [k]: e.target.value })); }

  function setLocation(lat, lng) {
    setForm(f => ({ ...f, lat, lng }));
  }

  function switchType(t) {
    setType(t);
    setForm({});
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    // Require location for stations
    if (type === "station" && (!form.lat || !form.lng)) {
      setError("Please pick the station location on the map.");
      return;
    }

    setBusy(true);
    try {
      await api("/api/admin/register", {
        method: "POST",
        body: JSON.stringify({ type, ...form }),
      });
      setSuccess(`${ENTITY_TYPES.find(t => t.value === type)?.label} registered successfully.`);
      setForm({});
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full mt-1.5 px-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500";
  const labelCls = "block text-xs font-semibold text-slate-700 mb-3";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Type selector */}
      <div className="flex gap-2 mb-6">
        {ENTITY_TYPES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => switchType(t.value)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl border transition-colors ${
              type === t.value
                ? "text-white border-[#1e3a5f]"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
            style={type === t.value ? { background: "#1e3a5f" } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-2 text-sm mb-4">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-2 text-sm mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <h3 className="font-bold text-slate-900 text-base">
          Register {ENTITY_TYPES.find(t => t.value === type)?.label}
        </h3>

        {/* ── Station form ── */}
        {type === "station" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                Station name
                <input type="text" required value={form.name||""} onChange={set("name")} className={inputCls} placeholder="e.g. Bole Station A" />
              </label>
              <label className={labelCls}>
                Region
                <input type="text" required value={form.region||""} onChange={set("region")} className={inputCls} placeholder="e.g. Addis Ababa" />
              </label>
              <label className={labelCls}>
                City
                <input type="text" value={form.city||""} onChange={set("city")} className={inputCls} placeholder="e.g. Addis Ababa" />
              </label>
              <label className={labelCls}>
                Street address
                <input type="text" value={form.address||""} onChange={set("address")} className={inputCls} placeholder="e.g. Bole Road" />
              </label>
            </div>

            {/* Initial stock */}
            <div className="grid grid-cols-2 gap-4">
              <label className={labelCls}>
                Initial Petrol stock (L)
                <input type="number" min="0" value={form.initialPetrol||""} onChange={set("initialPetrol")} className={inputCls} placeholder="0" />
              </label>
              <label className={labelCls}>
                Initial Diesel stock (L)
                <input type="number" min="0" value={form.initialDiesel||""} onChange={set("initialDiesel")} className={inputCls} placeholder="0" />
              </label>
            </div>

            {/* Map location picker */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Station location <span className="text-red-500">*</span>
              </p>
              <LocationPicker
                lat={form.lat}
                lng={form.lng}
                onChange={setLocation}
              />
              {form.lat && form.lng && (
                <p className="text-[11px] text-green-600 font-medium mt-1">
                  Location selected: {form.lat}, {form.lng}
                </p>
              )}
              {!form.lat && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Required — click the map to place the station pin
                </p>
              )}
            </div>

            {/* Manager account */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Station manager account
              </p>
              <div className="grid grid-cols-2 gap-4">
                <label className={labelCls}>
                  Full name
                  <input type="text" required value={form.managerName||""} onChange={set("managerName")} className={inputCls} />
                </label>
                <label className={labelCls}>
                  Email
                  <input type="email" required value={form.managerEmail||""} onChange={set("managerEmail")} className={inputCls} />
                </label>
                <label className={`${labelCls} col-span-2`}>
                  Password
                  <input type="password" required minLength={8} value={form.managerPassword||""} onChange={set("managerPassword")} className={inputCls} />
                </label>
              </div>
            </div>
          </>
        )}

        {/* ── Authority form ── */}
        {type === "authority" && (
          <>
            <label className={labelCls}>
              Full name
              <input type="text" required value={form.fullName||""} onChange={set("fullName")} className={inputCls} />
            </label>
            <label className={labelCls}>
              Email
              <input type="email" required value={form.email||""} onChange={set("email")} className={inputCls} />
            </label>
            <label className={labelCls}>
              Password
              <input type="password" required minLength={8} value={form.password||""} onChange={set("password")} className={inputCls} />
            </label>
          </>
        )}

        {/* ── Distributor form ── */}
        {type === "distributor" && (
          <>
            <label className={labelCls}>
              Organization name
              <input type="text" required value={form.organizationName||""} onChange={set("organizationName")} className={inputCls} />
            </label>
            <label className={labelCls}>
              Contact full name
              <input type="text" required value={form.fullName||""} onChange={set("fullName")} className={inputCls} />
            </label>
            <label className={labelCls}>
              Email
              <input type="email" required value={form.email||""} onChange={set("email")} className={inputCls} />
            </label>
            <label className={labelCls}>
              Password
              <input type="password" required minLength={8} value={form.password||""} onChange={set("password")} className={inputCls} />
            </label>
          </>
        )}

        <button
          type="submit"
          disabled={busy}
          className="text-white rounded-xl py-2.5 px-6 text-sm font-bold disabled:opacity-70"
          style={{ background: "#1e3a5f" }}
        >
          {busy ? "Registering…" : "Register"}
        </button>
      </form>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────

const TABS = [
  { id: "stats",    label: "Statistics" },
  { id: "users",    label: "Manage Users" },
  { id: "register", label: "Register Entity" },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("stats");

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-[#1e3a5f] px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-black text-[#1e3a5f]">S</div>
          <span className="text-white font-bold text-base">SmartFuel Ethiopia</span>
          <span className="text-blue-300 text-xs ml-2 uppercase tracking-wide">Admin Console</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-blue-200 text-sm hidden sm:inline">{user?.fullName}</span>
          <button onClick={() => navigate("/")} className="text-xs text-blue-200 border border-blue-700 rounded-lg px-3 py-1.5 hover:text-white">Home</button>
          <button onClick={handleLogout} className="text-xs text-blue-200 border border-blue-700 rounded-lg px-3 py-1.5 hover:text-white">Sign out</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage users, register entities and view platform statistics.</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-8 border-b border-slate-200 pb-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? "border-[#1e3a5f] text-[#1e3a5f]"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "stats"    && <StatsTab />}
        {tab === "users"    && <UsersTab />}
        {tab === "register" && <RegisterTab />}
      </div>
    </div>
  );
}

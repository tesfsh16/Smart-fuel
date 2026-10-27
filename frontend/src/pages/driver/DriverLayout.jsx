import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";

const tabs = [
  { to: "/driver",         label: "Find Fuel", end: true },
  { to: "/driver/map",     label: "Map"                  },
  { to: "/driver/reserve", label: "Reserve"              },
  { to: "/driver/queue",   label: "My Queue"             },
  { to: "/driver/ussd",    label: "USSD/SMS"             },
];

export default function DriverLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-900 px-5 py-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm font-black"
          style={{ color: "#1e3a5f" }}
        >
          S
        </div>
        <div>
          <div className="text-white font-bold text-[15px]">SmartFuel</div>
          <div className="text-blue-300 text-[11px]">Driver</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-blue-300 text-xs hover:text-white"
          >
            Home
          </button>
          <button
            onClick={user ? handleLogout : () => navigate("/register")}
            className="text-blue-300 text-xs hover:text-white"
          >
            {user ? "Sign out" : "Sign up"}
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto bg-slate-50" style={{ paddingBottom: 64 }}>
        <Outlet />
      </div>

      {/* Bottom navigation — white background */}
      <nav
        className="fixed bottom-0 left-0 w-full grid grid-cols-5 z-30"
        style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0" }}
      >
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center py-2.5 text-[10px] font-semibold gap-1 border-t-2 transition-colors ${
                isActive ? "" : "text-slate-400 border-transparent"
              }`
            }
            style={({ isActive }) =>
              isActive ? { color: "#1e3a5f", borderTopColor: "#1e3a5f" } : {}
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

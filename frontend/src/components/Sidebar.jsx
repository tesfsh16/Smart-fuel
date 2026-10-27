import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function Sidebar({ role, links, onNavigate }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    // Navigate to landing directly — bypass the LandingOrPortal redirect
    // by clearing auth first, then pushing to /
    navigate("/", { replace: true });
  }

  return (
    <nav className="w-56 min-h-screen flex flex-col flex-shrink-0" style={{ background: "#1e3a5f" }}>
      {/* Logo */}
      <div className="px-5 pt-7 pb-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-black text-sm flex-shrink-0 text-[#1e3a5f]">
            S
          </div>
          <span style={{ color: "#ffffff" }} className="font-bold text-base tracking-tight">SmartFuel</span>
        </div>
        <div className="text-[11px] pl-11 tracking-wide uppercase" style={{ color: "#93c5fd" }}>{role}</div>
      </div>

      {/* Nav links */}
      <div className="flex-1 px-2.5">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split("/").length === 2}
            onClick={onNavigate}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 2,
              fontSize: 14,
              fontWeight: 500,
              color: isActive ? "#1e3a5f" : "#ffffff",
              background: isActive ? "#ffffff" : "transparent",
              textDecoration: "none",
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains("active")) {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }
            }}
            onMouseLeave={e => {
              // restore only for non-active
              const isActive = e.currentTarget.style.color === "rgb(30, 58, 95)";
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="p-5 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <button
          onClick={() => navigate("/")}
          style={{ color: "#93c5fd", fontSize: 13, background: "none", border: "none", cursor: "pointer", display: "block" }}
          onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
          onMouseLeave={e => e.currentTarget.style.color = "#93c5fd"}
        >
          Home
        </button>
        <button
          onClick={handleLogout}
          style={{ color: "#93c5fd", fontSize: 13, background: "none", border: "none", cursor: "pointer", display: "block" }}
          onMouseEnter={e => e.currentTarget.style.color = "#ffffff"}
          onMouseLeave={e => e.currentTarget.style.color = "#93c5fd"}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}

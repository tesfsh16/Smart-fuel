import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

export default function TopBar({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.fullName
    ? user.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="flex items-center justify-between px-7 py-[18px] bg-white border-b border-slate-200">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-[13px] text-slate-600 font-medium hidden sm:inline">
            {user.fullName}
          </span>
        )}
        <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-sm">
          {initials}
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-[13px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium hover:bg-slate-50 hidden sm:block"
        >
          Home
        </button>
        {user && (
          <button
            onClick={handleLogout}
            className="text-[13px] text-red-600 bg-white border border-red-200 rounded-lg px-3 py-1.5 font-medium hover:bg-red-50"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

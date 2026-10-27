import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homePathForUser } from "../contexts/AuthContext.jsx";

// Guards a route. If not logged in, redirects to /register for driver routes,
// otherwise to /login.
// Pass redirectTo="/register" to send unauthenticated users to registration.
export default function ProtectedRoute({ roles, redirectTo, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!user) {
    const dest = redirectTo || "/login";
    return <Navigate to={dest} state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const allowed = new Set(roles);
    const hasRole = user.roles.some((r) => allowed.has(r.name));
    const isAdmin = user.roles.some((r) => r.name === "PLATFORM_ADMIN");
    if (!hasRole && !isAdmin) {
      return <Navigate to={homePathForUser(user)} replace />;
    }
  }

  return children;
}

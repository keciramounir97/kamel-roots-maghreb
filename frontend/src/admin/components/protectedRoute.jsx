import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({ children, roles = [], redirectTo = "/" }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ✅ WAIT until auth is fully resolved
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Checking authentication...
      </div>
    );
  }

  // ✅ Redirect ONLY after loading is false
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

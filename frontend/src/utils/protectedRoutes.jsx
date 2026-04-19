import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("token");

  let user = null;
  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (err) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp * 1000 < Date.now()) {
      localStorage.clear();
      return <Navigate to="/login" replace />;
    }

    const role = user.role_name?.toLowerCase()?.trim();

    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(role)) {
      return <Navigate to="/login" replace />;
    }

    return children;
  } catch (e) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
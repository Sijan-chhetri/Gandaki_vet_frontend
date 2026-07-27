import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

function normaliseRole(role) {
  if (!role) {
    return "";
  }

  return String(role)
    .trim()
    .replaceAll("-", "_")
    .replaceAll(" ", "_")
    .toUpperCase();
}

function getStoredUser() {
  try {
    const storedUser =
      localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch (error) {
    console.error(
      "Unable to read stored user:",
      error,
    );

    return null;
  }
}

function getCurrentUserRole(user) {
  return normaliseRole(
    user?.role ||
      user?.userRole ||
      user?.data?.role ||
      user?.user?.role,
  );
}

function ProtectedRoute({
  allowedRoles = [],
}) {
  const location = useLocation();

  const token =
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token");

  const user = getStoredUser();
  const userRole =
    getCurrentUserRole(user);

  if (!token || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
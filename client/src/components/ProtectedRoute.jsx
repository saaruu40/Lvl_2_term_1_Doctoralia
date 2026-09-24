import { Navigate } from "react-router-dom";

// Simple protected route — average coder level.
// Checks localStorage token + role data. If missing, redirect to role login.
// Public pages (/, /login, /doctor-login, etc.) are NOT wrapped, so they stay public.
export default function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");

  // detect which role is stored (shared token key, one role at a time)
  const hasAdmin = !!localStorage.getItem("admin");
  const hasDoctor = !!localStorage.getItem("doctor");
  const hasStaff = !!localStorage.getItem("staff");
  const hasPatient = !!localStorage.getItem("patient");
  const hasAnyRole = hasAdmin || hasDoctor || hasStaff || hasPatient;

  // not logged in at all
  if (!token || !hasAnyRole) {
    // pick redirect based on allowedRoles first entry, fallback to /login (admin)
    const fallback = allowedRoles && allowedRoles[0] ? roleToLogin(allowedRoles[0]) : "/login";
    return <Navigate to={fallback} replace />;
  }

  // if allowedRoles specified, check role matches
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = hasAdmin ? "admin" : hasDoctor ? "doctor" : hasStaff ? "staff" : hasPatient ? "patient" : null;
    if (!allowedRoles.includes(userRole)) {
      // wrong role — send to their own dashboard or login
      return <Navigate to={roleToLogin(userRole)} replace />;
    }
  }

  return children;
}

function roleToLogin(role) {
  if (role === "doctor") return "/doctor-login";
  if (role === "staff") return "/staff-login";
  if (role === "patient") return "/patient-login";
  return "/login";
}

import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Header from "./components/Header";

import HomePage from "./pages/HomePage";
import AdminLogin from "./pages/AdminLogin";

import DoctorRegistration from "./pages/DoctorRegistration";
import DoctorLogin from "./pages/DoctorLogin";

import StaffRegistration from "./pages/StaffRegistration";
import StaffLogin from "./pages/StaffLogin";

import PatientRegistration from "./pages/PatientRegistration";
import PatientLogin from "./pages/PatientLogin";

import AdminDashboard from "./pages/AdminDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";

function App() {
  const location = useLocation();

  const hideHeader =
    location.pathname === "/" ||
    location.pathname === "/admin-dashboard" ||
    location.pathname === "/patient-dashboard" ||
    location.pathname === "/doctor-dashboard";

  return (
    <>
      {!hideHeader && <Header />}

      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<AdminLogin />} />

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/doctor-registration"
          element={<DoctorRegistration />}
        />

        <Route path="/doctor-login" element={<DoctorLogin />} />

        <Route
          path="/staff-registration"
          element={<StaffRegistration />}
        />

        <Route path="/staff-login" element={<StaffLogin />} />

        <Route
          path="/patient-registration"
          element={<PatientRegistration />}
        />

        <Route path="/patient-login" element={<PatientLogin />} />

        <Route
          path="/patient-dashboard"
          element={<PatientDashboard />}
        />

        <Route
          path="/doctor-dashboard"
          element={<DoctorDashboard />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default App;

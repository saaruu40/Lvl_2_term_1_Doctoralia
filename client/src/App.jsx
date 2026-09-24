
// import {
//   Routes,
//   Route,
//   Navigate,
//   useLocation,
// } from "react-router-dom";

// import Header from "./components/Header";

// import AdminRegister from "./pages/AdminRegister";
// import AdminLogin from "./pages/AdminLogin";

// import DoctorRegistration from "./pages/DoctorRegistration";
// import DoctorLogin from "./pages/DoctorLogin";

// import StaffRegistration from "./pages/StaffRegistration";
// import StaffLogin from "./pages/StaffLogin";
// import StaffDashboard from "./pages/StaffDashboard";

// import PatientRegistration from "./pages/PatientRegistration";
// import PatientLogin from "./pages/PatientLogin";

// import AdminDashboard from "./pages/AdminDashboard";
// import PatientDashboard from "./pages/PatientDashboard";

// function App() {
//   const location = useLocation();

//   const hideHeader =
//     location.pathname === "/admin-dashboard" ||
//     location.pathname === "/patient-dashboard" ||
//     location.pathname === "/staff-dashboard";

//   return (
//     <>
//       {!hideHeader && <Header />}

//       <Routes>
//         <Route
//           path="/"
//           element={<Navigate to="/register" replace />}
//         />

//         {/* ADMIN */}
//         <Route path="/register" element={<AdminRegister />} />
//         <Route path="/login" element={<AdminLogin />} />
//         <Route path="/admin-dashboard" element={<AdminDashboard />} />

//         {/* DOCTOR */}
//         <Route
//           path="/doctor-registration"
//           element={<DoctorRegistration />}
//         />
//         <Route path="/doctor-login" element={<DoctorLogin />} />

//         {/* STAFF */}
//         <Route
//           path="/staff-registration"
//           element={<StaffRegistration />}
//         />
//         <Route path="/staff-login" element={<StaffLogin />} />
//         <Route path="/staff-dashboard" element={<StaffDashboard />} />

//         {/* PATIENT */}
//         <Route
//           path="/patient-registration"
//           element={<PatientRegistration />}
//         />
//         <Route path="/patient-login" element={<PatientLogin />} />
//         <Route path="/patient-dashboard" element={<PatientDashboard />} />

//         <Route
//           path="*"
//           element={<Navigate to="/register" replace />}
//         />
//       </Routes>
//     </>
//   );
// }

// export default App;
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Header from "./components/Header";
import ProtectedRoute from "./components/ProtectedRoute";

import AdminRegister from "./pages/AdminRegister";
import AdminLogin from "./pages/AdminLogin";

import DoctorRegistration from "./pages/DoctorRegistration";
import DoctorLogin from "./pages/DoctorLogin";
import DoctorDashboard from "./pages/DoctorDashboard";

import StaffRegistration from "./pages/StaffRegistration";
import StaffLogin from "./pages/StaffLogin";
import StaffDashboard from "./pages/StaffDashboard";

import PatientRegistration from "./pages/PatientRegistration";
import PatientLogin from "./pages/PatientLogin";

import AdminDashboard from "./pages/AdminDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import Home from "./pages/Home";
import DoctorProfile from "./pages/DoctorProfile";


function App() {
  const location = useLocation();

  const hideHeader =
    location.pathname === "/" ||
    location.pathname.startsWith("/doctors/") ||
    location.pathname === "/admin-dashboard" ||
    location.pathname === "/patient-dashboard" ||
    location.pathname === "/staff-dashboard" ||
    location.pathname === "/doctor-dashboard";

  return (
    <>
      {!hideHeader && <Header />}

      <Routes>

        {/* HOME - public */}
        <Route path="/" element={<Home />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />


        {/* ADMIN - registration disabled singleton */}

        <Route
          path="/register"
          element={<AdminRegister />}
        />

        <Route
          path="/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />


        {/* DOCTOR */}

        <Route
          path="/doctor-registration"
          element={<DoctorRegistration />}
        />

        <Route
          path="/doctor-login"
          element={<DoctorLogin />}
        />

        <Route
          path="/doctor-dashboard"
          element={
            <ProtectedRoute allowedRoles={["doctor"]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />


        {/* STAFF */}

        <Route
          path="/staff-registration"
          element={<StaffRegistration />}
        />

        <Route
          path="/staff-login"
          element={<StaffLogin />}
        />

        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />


        {/* PATIENT */}

        <Route
          path="/patient-registration"
          element={<PatientRegistration />}
        />

        <Route
          path="/patient-login"
          element={<PatientLogin />}
        />

        <Route
          path="/patient-dashboard"
          element={
            <ProtectedRoute allowedRoles={["patient"]}>
              <PatientDashboard />
            </ProtectedRoute>
          }
        />


        {/* FALLBACK */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </>
  );
}

export default App;
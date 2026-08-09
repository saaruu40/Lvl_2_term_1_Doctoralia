
// import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// import Header from "./components/Header";
// import AdminRegister from "./pages/AdminRegister";
// import AdminLogin from "./pages/AdminLogin";
// import DoctorRegistration from "./pages/DoctorRegistration";
// import DoctorLogin from "./pages/DoctorLogin";
// import StaffRegistration from "./pages/StaffRegistration";
// import StaffLogin from "./pages/StaffLogin";
// import PatientRegistration from "./pages/PatientRegistration";
// import PatientLogin from "./pages/PatientLogin";
// import AdminDashboard from "./pages/AdminDashboard";

// function App() {
//   const location = useLocation();

//   const hideHeader =
//     location.pathname === "/admin-dashboard";

//   return (
//     <>
//       {!hideHeader && <Header />}

//       <Routes>
//         <Route
//           path="/"
//           element={<Navigate to="/register" replace />}
//         />

//         <Route path="/register" element={<AdminRegister />} />
//         <Route path="/login" element={<AdminLogin />} />

//         <Route
//           path="/doctor-registration"
//           element={<DoctorRegistration />}
//         />
//         <Route
//           path="/doctor-login"
//           element={<DoctorLogin />}
//         />

//         <Route
//           path="/staff-registration"
//           element={<StaffRegistration />}
//         />
//         <Route
//           path="/staff-login"
//           element={<StaffLogin />}
//         />

//         <Route
//           path="/patient-registration"
//           element={<PatientRegistration />}
//         />
//         <Route
//           path="/patient-login"
//           element={<PatientLogin />}
//         />

//         <Route
//           path="/admin-dashboard"
//           element={<AdminDashboard />}
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

import AdminRegister from "./pages/AdminRegister";
import AdminLogin from "./pages/AdminLogin";

import DoctorRegistration from "./pages/DoctorRegistration";
import DoctorLogin from "./pages/DoctorLogin";

import StaffRegistration from "./pages/StaffRegistration";
import StaffLogin from "./pages/StaffLogin";

import PatientRegistration from "./pages/PatientRegistration";
import PatientLogin from "./pages/PatientLogin";

import AdminDashboard from "./pages/AdminDashboard";
import PatientDashboard from "./pages/PatientDashboard";


function App() {
  const location = useLocation();

  const hideHeader =
    location.pathname === "/admin-dashboard" ||
    location.pathname === "/patient-dashboard";

  return (
    <>
      {!hideHeader && <Header />}

      <Routes>

        {/* DEFAULT */}

        <Route
          path="/"
          element={
            <Navigate
              to="/register"
              replace
            />
          }
        />


        {/* ADMIN */}

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
          element={<AdminDashboard />}
        />


        {/* DOCTOR */}

        <Route
          path="/doctor-registration"
          element={
            <DoctorRegistration />
          }
        />

        <Route
          path="/doctor-login"
          element={<DoctorLogin />}
        />


        {/* STAFF */}

        <Route
          path="/staff-registration"
          element={
            <StaffRegistration />
          }
        />

        <Route
          path="/staff-login"
          element={<StaffLogin />}
        />


        {/* PATIENT */}

        <Route
          path="/patient-registration"
          element={
            <PatientRegistration />
          }
        />

        <Route
          path="/patient-login"
          element={<PatientLogin />}
        />

        <Route
          path="/patient-dashboard"
          element={<PatientDashboard />}
        />
    <Route
  path="*"
  element={
    <Navigate
      to="/register"
      replace
    />
  }
/>

      </Routes>
    </>
  );
}

export default App;
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header.jsx";

import AdminRegister from "./pages/AdminRegister.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import DoctorRegistration from "./pages/DoctorRegistration.jsx";
import DoctorLogin from "./pages/DoctorLogin.jsx";

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<Navigate to="/register" replace />} />

        <Route path="/register" element={<AdminRegister />} />
        <Route path="/login" element={<AdminLogin />} />

        <Route
          path="/doctor-registration"
          element={<DoctorRegistration />}
        />

        <Route
          path="/doctor-login"
          element={<DoctorLogin />}
        />

        <Route path="*" element={<h1>Page Not Found</h1>} />
      </Routes>
    </>
  );
}

export default App;
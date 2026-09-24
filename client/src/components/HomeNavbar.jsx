import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jfif";
import "../styles/Home.css";

export default function HomeNavbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const hasAny = !!localStorage.getItem("admin") || !!localStorage.getItem("doctor") || !!localStorage.getItem("staff") || !!localStorage.getItem("patient");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    setOpen(false);
    navigate("/login");
  };

  return (
    <header className="home-navbar">
      <Link to="/" className="home-logo">
        <img src={logo} alt="Doctoralia" className="home-logo-img" />
        <span>Doctoralia</span>
      </Link>
      <nav className="home-nav">
        <a href="#top">Home</a>
        <a href="#doctors">Doctors</a>
        <a href="#departments">Departments</a>
        <div className="home-account">
          <button className="home-account-btn" onClick={() => setOpen(!open)}>Account ▾</button>
          {open && (
            <div className="home-account-menu">
              {!hasAny ? (
                <>
                  <Link to="/patient-login" onClick={() => setOpen(false)}>Patient</Link>
                  <Link to="/doctor-login" onClick={() => setOpen(false)}>Doctor</Link>
                  <Link to="/staff-login" onClick={() => setOpen(false)}>Staff</Link>
                  <Link to="/login" onClick={() => setOpen(false)}>Admin</Link>
                </>
              ) : (
                <>
                  <span style={{ padding: "8px 12px", fontSize: "12px", color: "#666" }}>Already logged in</span>
                  <button onClick={handleLogout} className="home-logout-btn">Logout</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

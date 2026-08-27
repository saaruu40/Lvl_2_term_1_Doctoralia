import { Link } from "react-router-dom";
import logo from "../assets/logo.jfif";
import "../styles/Header.css";

function Header() {
  return (
    <header className="main-header">
      <Link to="/" className="logo-link">
        <img src={logo} alt="Doctoralia Logo" className="header-logo" />
      </Link>

      <nav className="header-nav">
        <Link to="/">Home</Link>
        <Link to="/login">Admin Login</Link>
        <Link to="/doctor-registration">Doctor Registration</Link>
        <Link to="/doctor-login">Doctor Login</Link>
        <Link to="/staff-registration">Staff Registration</Link>
        <Link to="/staff-login">Staff Login</Link>
        <Link to="/patient-registration">Patient Sign Up</Link>
        <Link to="/patient-login">Patient Login</Link>
      </nav>
    </header>
  );
}

export default Header;

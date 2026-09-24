
import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jfif";
import "../styles/Header.css";

const ROLES = [
  {
    key: "admin",
    label: "Admin",
    links: [{ text: "Admin Login", to: "/login" }],
  },
  {
    key: "doctor",
    label: "Doctor",
    links: [
      { text: "Doctor Login", to: "/doctor-login" },
      { text: "Doctor Registration", to: "/doctor-registration" },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    links: [
      { text: "Staff Login", to: "/staff-login" },
      { text: "Staff Registration", to: "/staff-registration" },
    ],
  },
  {
    key: "patient",
    label: "Patient",
    links: [
      { text: "Patient Login", to: "/patient-login" },
      { text: "Patient Sign Up", to: "/patient-registration" },
    ],
  },
];

function Header({ role = null }) {
  const [openMenu, setOpenMenu] = useState(null);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // role thakle shudhu oi role, na thakle shob gulo
  const visibleRoles = role ? ROLES.filter((r) => r.key === role) : ROLES;

  const btnStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    color: "inherit",
    padding: "8px 12px",
    fontFamily: "inherit",
  };

  const menuStyle = {
    position: "absolute",
    top: "100%",
    right: 0,
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    minWidth: "170px",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
  };

  const linkStyle = {
    padding: "10px 14px",
    textDecoration: "none",
    color: "#333",
    fontSize: "0.9rem",
  };

  return (
    <header className="main-header">
      <Link to="/" className="logo-link">
        <img
          src={logo}
          alt="Doctoralia Logo"
          className="header-logo"
          style={{ height: "50px", width: "auto" }}
        />
      </Link>

      <nav
        className="header-nav"
        style={{ display: "flex", gap: "10px", alignItems: "center", marginRight: "40px", }}
      >
        {visibleRoles.map((r) => (
          <div key={r.key} style={{ position: "relative" }}>
            <button style={btnStyle} onClick={() => toggleMenu(r.key)}>
              {r.label} ▾
            </button>

            {openMenu === r.key && (
              <div style={menuStyle}>
                {r.links.map((l) => (
                  <Link
                    key={l.to}
                    style={linkStyle}
                    to={l.to}
                    onClick={() => setOpenMenu(null)}
                  >
                    {l.text}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
}

export default Header;
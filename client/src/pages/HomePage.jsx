import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jfif";
import "../styles/HomePage.css";

function HomePage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [showDoctors, setShowDoctors] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/departments"
        );
        const data = await response.json();
        if (response.ok) {
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingDepartments(false);
      }
    };
    loadDepartments();
  }, []);

  const loadAvailableDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (deptFilter) params.append("department_id", deptFilter);
      const url = `http://localhost:5000/api/availability/doctors${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setDoctors(data.doctors || []);
      else setDoctors([]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (showDoctors) loadAvailableDoctors();
  }, [showDoctors, deptFilter]);

  // Live search: debounce while typing when list is visible
  useEffect(() => {
    if (!showDoctors) return;
    const t = setTimeout(() => {
      loadAvailableDoctors();
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadAvailableDoctors();
  };

  const formatTime12h = (t) => {
    if (!t) return "";
    const [hStr, mStr] = String(t).split(":");
    let h = Number(hStr);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${m.padStart(2, "0")} ${ampm}`;
  };
  const formatWeekday = (dateStr) => {
    if (!dateStr) return "";
    try {
      // Parse as local calendar date to avoid UTC midnight weekday shift
      const s = String(dateStr).slice(0, 10);
      const parts = s.split("-").map(Number);
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return "";
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-US", { weekday: "long" });
    } catch { return ""; }
  };

  const handleBook = async (doctorId) => {
    const patientStr = localStorage.getItem("patient");
    if (!patientStr) {
      setMsg("Please login as patient to book.");
      navigate("/patient-login");
      return;
    }
    const patient = JSON.parse(patientStr);
    try {
      const res = await fetch("http://localhost:5000/api/patients/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.patient_id, doctor_id: doctorId }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (!res.ok && data.message.includes("Cannot book")) {
        alert(data.message);
      }
    } catch (e) {
      setMsg("Could not book.");
    }
  };

  return (
    <div className="home-page">
      <header className="home-topbar">
        <Link to="/" className="home-brand-link">
          <img src={logo} alt="Doctoralia" className="home-top-logo" />
          <span>Doctoralia</span>
        </Link>

        <nav className="home-top-nav">
          <div className={`home-dept-menu ${deptOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="home-dept-toggle"
              aria-expanded={deptOpen}
              aria-haspopup="true"
              onClick={() => {
                setDeptOpen((open) => !open);
                setLoginOpen(false);
              }}
            >
              Departments
            </button>

            {deptOpen && (
              <div className="home-dept-dropdown" role="menu">
                {loadingDepartments ? (
                  <span className="home-dept-empty">Loading...</span>
                ) : departments.length === 0 ? (
                  <span className="home-dept-empty">No departments yet</span>
                ) : (
                  departments.map((department) => (
                    <div
                      key={department.department_id}
                      className="home-dept-item"
                      role="menuitem"
                    >
                      <strong>{department.department_name}</strong>
                      {department.description ? (
                        <p>{department.description}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className={`home-login-menu ${loginOpen ? "is-open" : ""}`}>
            <button
              type="button"
              className="home-login-toggle"
              aria-expanded={loginOpen}
              aria-haspopup="true"
              onClick={() => {
                setLoginOpen((open) => !open);
                setDeptOpen(false);
              }}
            >
              Login
            </button>

            {loginOpen && (
              <div className="home-login-dropdown" role="menu">
                <Link to="/login" role="menuitem" onClick={() => setLoginOpen(false)}>
                  Admin
                </Link>
                <Link
                  to="/doctor-login"
                  role="menuitem"
                  onClick={() => setLoginOpen(false)}
                >
                  Doctor
                </Link>
                <Link
                  to="/staff-login"
                  role="menuitem"
                  onClick={() => setLoginOpen(false)}
                >
                  Staff
                </Link>
                <Link
                  to="/patient-login"
                  role="menuitem"
                  onClick={() => setLoginOpen(false)}
                >
                  Patient
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <p className="home-brand-mark">Doctoralia</p>
          <h1>Open departments. Real opportunity for doctors.</h1>
          <p className="home-hero-copy">
            Join Doctoralia and practice in the specialty where patients are
            already waiting for care.
          </p>
          <button className="home-see-btn" onClick={() => setShowDoctors(!showDoctors)}>
            {showDoctors ? "Hide Available Doctors" : "See Available Doctors"}
          </button>
        </div>
      </section>

      {showDoctors && (
        <section className="home-available">
          <div className="home-section-inner">
            <h2>Available Doctors</h2>
            <p style={{ fontSize: "0.85rem", color: "#555" }}>Search by name, filter by department, sorted A-Z. Shows hospital, date, time, today&apos;s status.</p>
            <form onSubmit={handleSearch} className="home-search-bar">
              <input
                type="text"
                placeholder="Search doctor by name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                ))}
              </select>
              <button type="submit">Search</button>
            </form>
            {msg && <div style={{ padding: "8px", background: "#e8f1f0", marginTop: 8 }}>{msg}</div>}
            <div className="home-doctor-grid">
              {doctors.length === 0 ? (
                <p>No doctors found.</p>
              ) : (
                doctors.map((doc) => (
                  <div key={doc.doctor_id} className="home-doctor-card">
                    <h3>Dr. {doc.full_name}</h3>
                    <p><strong>Department:</strong> {doc.department_name || "-"}</p>
                    <p><strong>Qualification:</strong> {doc.qualification || "-"}</p>
                    <p><strong>Specialization:</strong> {doc.specification || "-"}</p>
                    {doc.no_schedule || !doc.schedules || doc.schedules.length === 0 ? (
                      <div className="home-schedule-block">
                        <p>No schedule available.</p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ marginTop: 8 }}><strong>Schedule:</strong></p>
                        {doc.schedules.map((s, idx) => {
                          if (!s.available_date) return <div key={idx} className="home-schedule-block"><p>No schedule available.</p></div>;
                          const weekday = formatWeekday(s.available_date);
                          const statusText = s.display_status || s.status || "";
                          const cls = statusText.toLowerCase().replace(/\s+/g, '-');
                          return (
                          <div key={idx} className="home-schedule-block">
                            <p><strong>Hospital:</strong> {s.hospital_name || "-"}</p>
                            <p>{weekday}: {formatTime12h(s.start_time)} - {formatTime12h(s.end_time)}</p>
                            <p><strong>Status:</strong> <span className={`status-badge ${cls}`}>{statusText}</span></p>
                            {statusText === "Available" ? (
                              <button className="book-btn" onClick={() => handleBook(doc.doctor_id)}>Book Appointment</button>
                            ) : statusText === "Upcoming" ? (
                              <p className="upcoming-note">Upcoming</p>
                            ) : (
                              <p className="unavailable-note">Schedule ended</p>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <section className="home-opportunity">
        <div className="home-section-inner home-opportunity-grid">
          <div>
            <h2>Why doctors choose Doctoralia</h2>
            <p>
              Build your schedule, reach more patients, and grow with a
              hospital network that keeps specialties organized and open.
            </p>
          </div>

          <ol className="home-steps">
            <li>
              <span>01</span>
              Pick an open department that fits your specialty.
            </li>
            <li>
              <span>02</span>
              Submit your doctor application with credentials.
            </li>
            <li>
              <span>03</span>
              After admin approval, start receiving appointments.
            </li>
          </ol>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-brand">
          <img src={logo} alt="Doctoralia" />
          <div>
            <strong>Doctoralia</strong>
            <p>Healthcare careers and care, in one place.</p>
          </div>
        </div>

        <div className="home-footer-links">
          <Link to="/doctor-registration">Doctor Apply</Link>
          <Link to="/staff-registration">Staff Apply</Link>
          <Link to="/patient-registration">Patient Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;

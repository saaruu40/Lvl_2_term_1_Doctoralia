import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/DoctorDashboard.css";

const API = "http://localhost:5000/api/doctors";

function DoctorDashboard() {
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showList, setShowList] = useState(true);
  const [form, setForm] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
    hospital_id: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem("doctor");
    if (!stored) {
      navigate("/doctor-login");
      return;
    }
    setDoctor(JSON.parse(stored));
  }, [navigate]);

  const loadHospitals = async () => {
    try {
      const res = await fetch(`${API}/hospitals`);
      const data = await res.json();
      if (res.ok) setHospitals(data.hospitals || []);
    } catch (e) { console.error(e); }
  };

  const loadSchedules = async (docId) => {
    try {
      const res = await fetch(`${API}/schedules`, {
        headers: { "x-doctor-id": docId },
      });
      const data = await res.json();
      if (res.ok) setSchedules(data.schedules || []);
      else setMessage(data.message);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (doctor?.doctor_id) {
      loadHospitals();
      loadSchedules(doctor.doctor_id);
    }
  }, [doctor]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");
    const url = editingId ? `${API}/schedules/${editingId}` : `${API}/schedules`;
    const method = editingId ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-doctor-id": doctor.doctor_id,
        },
        body: JSON.stringify({
          available_date: form.available_date,
          start_time: form.start_time,
          end_time: form.end_time,
          hospital_id: Number(form.hospital_id),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Schedule fixed successfully.");
        setMessageType("success");
      } else {
        setMessage(data.message || "Could not save schedule.");
        setMessageType(data.message === "Schedule fixing time is over." ? "warning" : "error");
      }
      if (res.ok) {
        setForm({ available_date: "", start_time: "", end_time: "", hospital_id: "" });
        setEditingId(null);
        loadSchedules(doctor.doctor_id);
      }
    } catch (err) {
      setMessage("Could not save schedule.");
      setMessageType("error");
    }
  };

  const startEdit = (s) => {
    // Prefer YYYY-MM-DD string from API; avoid toISOString UTC day-shift
    const raw = s.available_date;
    const d =
      typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? raw.slice(0, 10)
        : raw
          ? (() => {
              const dt = new Date(raw);
              if (Number.isNaN(dt.getTime())) return "";
              const y = dt.getFullYear();
              const m = String(dt.getMonth() + 1).padStart(2, "0");
              const day = String(dt.getDate()).padStart(2, "0");
              return `${y}-${m}-${day}`;
            })()
          : "";
    const start = s.start_time ? String(s.start_time).slice(0, 5) : "";
    const end = s.end_time ? String(s.end_time).slice(0, 5) : "";
    setForm({ available_date: d, start_time: start, end_time: end, hospital_id: String(s.hospital_id || "") });
    setEditingId(s.schedule_id);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this schedule?")) return;
    try {
      const res = await fetch(`${API}/schedules/${id}`, {
        method: "DELETE",
        headers: { "x-doctor-id": doctor.doctor_id },
      });
      const data = await res.json();
      setMessage(data.message);
      setMessageType(data.message && data.message.includes("fixed") ? "success" : data.message === "Schedule fixing time is over." ? "warning" : "");
      if (res.ok) loadSchedules(doctor.doctor_id);
    } catch (e) { setMessage("Could not delete."); setMessageType("error"); }
  };

  const logout = () => {
    localStorage.removeItem("doctor");
    navigate("/doctor-login");
  };

  if (!doctor) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="doctor-dashboard">
      <header className="doctor-dash-header">
        <h2>Doctor Panel — {doctor.full_name}</h2>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>
      {message && <div className={`dash-message ${messageType || (message.includes("fixed successfully") ? "success" : message === "Schedule fixing time is over." ? "warning" : "")}`}>{message}</div>}
      <p className="window-note">Fix schedule for a date only between <strong>15:00–18:00 (Asia/Dhaka)</strong> on that same date. Server time enforced. If after 18:00 you will see: <strong>Schedule fixing time is over.</strong></p>

      <section className="schedule-form-section">
        <h3>{editingId ? "Update Schedule" : "Fix New Schedule"}</h3>
        <form onSubmit={handleSubmit} className="schedule-form">
          <label>Available Date
            <input type="date" name="available_date" value={form.available_date} onChange={handleChange} required />
          </label>
          <label>Start Time
            <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required />
          </label>
          <label>End Time
            <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required />
          </label>
          <label>Hospital
            <select name="hospital_id" value={form.hospital_id} onChange={handleChange} required>
              <option value="">Select Hospital</option>
              {hospitals.map((h) => (
                <option key={h.hospital_id} value={h.hospital_id}>{h.hospital_name} - {h.city}</option>
              ))}
            </select>
          </label>
          <button type="submit">{editingId ? "Update" : "Fix Schedule"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ available_date: "", start_time: "", end_time: "", hospital_id: "" }); }}>Cancel</button>}
        </form>
      </section>

      <section className="schedule-list-section">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3>My Schedules</h3>
          <button type="button" onClick={() => setShowList((v) => !v)} title="Schedule List" style={{ padding: "6px 10px", cursor: "pointer", border: "1px solid #0c6e74", background: "#fff", color: "#0c6e74" }}>
            {showList ? "Hide" : "Show"} Schedule List {schedules.length ? `(${schedules.length})` : ""} 📋
          </button>
        </div>
        {!showList ? (
          <p style={{ fontSize: "0.85rem", color: "#666" }}>Schedule list hidden. Click Show to view all schedules.</p>
        ) : schedules.length === 0 ? (
          <p>No schedules yet. Fix one during 15:00–18:00 of that date (same date, Dhaka time).</p>
        ) : (
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Hospital</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const statusText = s.display_status || s.computed_status || s.status || "";
                const cls = statusText.toLowerCase().replace(/\s+/g, '-');
                return (
                  <tr key={s.schedule_id}>
                    <td>{s.available_date ? new Date(s.available_date).toLocaleDateString() : "-"}</td>
                    <td>{s.start_time} - {s.end_time}</td>
                    <td>{s.hospital_name} {s.city ? `(${s.city})` : ""}</td>
                    <td>
                      <span className={`status-badge ${cls}`}>{statusText}</span>
                    </td>
                    <td>
                      <button onClick={() => startEdit(s)}>Edit</button>
                      <button onClick={() => handleDelete(s.schedule_id)}>Remove</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default DoctorDashboard;

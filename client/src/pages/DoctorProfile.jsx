import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import HomeNavbar from "../components/HomeNavbar";
import "../styles/Home.css";

const API = "http://localhost:5000";

export default function DoctorProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [selected, setSelected] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`${API}/api/patients/doctors/${id}`).then(r=>r.json()).then(d=>{
      if (d.doctor) setDoctor(d.doctor);
      else setMsg("Doctor not found.");
    }).catch(()=>setMsg("Could not load doctor."));
    fetch(`${API}/api/patients/doctors/${id}/schedules`).then(r=>r.json()).then(d=>setSchedules(d.schedules||d.slots||[])).catch(()=>{});
  }, [id]);

  const book = () => {
    const token = localStorage.getItem("token");
    const isPatient = !!token && !!localStorage.getItem("patient");
    if (!isPatient) {
      navigate("/patient-login");
      return;
    }
    navigate("/patient-dashboard");
  };

  if (!doctor) return <div><HomeNavbar /><div className="home-page" style={{ padding:20 }}>{msg || "Loading..."}</div></div>;

  return (
    <div>
      <HomeNavbar />
      <div className="home-page" style={{ paddingTop: 16 }}>
        <div className="home-section">
          <h2>Dr. {doctor.full_name}</h2>
          <p><strong>Department:</strong> {doctor.department_name || "-"}</p>
          <p><strong>Qualification:</strong> {doctor.qualification || "-"}</p>
          <p><strong>Specialization:</strong> {doctor.specification || "-"}</p>
          <p><strong>Fee:</strong> ৳{doctor.new_patient_fee} / Follow-up ৳{doctor.followup_fee}</p>
          {doctor.profile_photo && <img src={`${API}/uploads/${String(doctor.profile_photo).replace("/uploads/","")}`} alt={doctor.full_name} style={{ width:120, height:120, borderRadius:"50%", marginTop:10 }} />}
        </div>

        <div className="home-section">
          <h2>Available Schedule</h2>
          {schedules.length===0 ? <p>No available slots.</p> : (
            <>
              <select value={selected} onChange={e=>setSelected(e.target.value)} style={{ padding:8, border:"1px solid #d1d5db", borderRadius:6, minWidth:260 }}>
                <option value="">Select slot</option>
                {schedules.map(s=>(
                  <option key={s.schedule_id} value={s.schedule_id}>
                    {String(s.available_date).split("T")[0]} {String(s.start_time).slice(0,5)}-{String(s.end_time).slice(0,5)} {s.hospital_name || ""} {s.slot_status || s.status || ""}
                  </option>
                ))}
              </select>
              <button onClick={book} style={{ marginLeft:10, padding:"8px 14px", background:"#075f68", color:"white", border:"none", borderRadius:6, cursor:"pointer" }}>Book Appointment</button>
            </>
          )}
          {msg && <p style={{ marginTop:10, color: msg.includes("Booked")? "green":"#991b1b" }}>{msg}</p>}
          <p style={{ fontSize:"12px", color:"#6b7280", marginTop:8 }}>Slots are filtered by server isSlotExpired() — expired slots are hidden.</p>
        </div>

        <Link to="/" style={{ display:"inline-block", marginTop:12, color:"#075f68" }}>← Back to Home</Link>
      </div>
    </div>
  );
}

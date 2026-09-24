import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import HomeNavbar from "../components/HomeNavbar";
import "../styles/Home.css";

const API = "http://localhost:5000";

export default function Home() {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [staffRequired, setStaffRequired] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/departments`).then(r=>r.json()).then(d=>setDepartments(d.departments||[])).catch(()=>{});
    fetch(`${API}/api/admin/public-contact`).then(r=>r.json()).then(d=>setAdminEmail(d.email||"")).catch(()=>setAdminEmail("sara@gmail.com"));
    fetch(`${API}/api/patients/staff-required`).then(r=>r.json()).then(d=>setStaffRequired(!!d.staff_required)).catch(()=>{});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.append("search", search.trim());
    if (selectedDept) params.append("department_id", selectedDept);
    let url = `${API}/api/patients/doctors`;
    if (params.toString()) url += `?${params.toString()}`;
    fetch(url).then(r=>r.json()).then(d=>setDoctors(d.doctors||[])).catch(()=>{});
  }, [search, selectedDept]);

  const handleDeptClick = (id) => {
    setSelectedDept(String(id));
    document.getElementById("doctors")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div>
      <HomeNavbar />
      <div className="home-page" id="top">

        {/* 1. Doctor registration ad */}
        <section className="home-hero">
          <h1>Are you a Doctor?</h1>
          <p>Grow your practice with Doctoralia.</p>
          <p>Manage appointments, patients and schedules easily.</p>
          <Link to="/doctor-registration" className="home-btn">Register as a Doctor</Link>
        </section>

        {/* 2. Staff Required — generic, no doctor details */}
        {staffRequired && (
          <section className="home-section" style={{ textAlign: "center", border: "1px solid #e5e7eb", borderRadius: "10px", background: "white", padding: "24px" }}>
            <h2>📢 STAFF REQUIRED</h2>
            <p style={{ fontSize: "14px", color: "#374151", marginTop: "8px" }}>Some doctors currently need available staff members.</p>
            <Link to="/staff-registration" style={{ display: "inline-block", background: "#075f68", color: "white", padding: "10px 18px", borderRadius: "6px", textDecoration: "none", marginTop: "14px", fontSize: "14px" }}>Register as Staff</Link>
          </section>
        )}

        {/* 3. Find Your Doctor */}
        <section className="home-section" id="doctors">
          <h2>Find Your Doctor</h2>
          <div className="home-filters" style={{ flexDirection:"column" }}>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <div style={{ position:"relative", minWidth:260 }}>
                <div onClick={()=>setDoctorDropdownOpen(!doctorDropdownOpen)} style={{ border:"1px solid #d1d5db", padding:"8px 10px", borderRadius:"6px", cursor:"pointer", background:"white", display:"flex", justifyContent:"space-between" }}>
                  <span>{search ? search : "Search or Select Doctor"}</span><span>▼</span>
                </div>
                {doctorDropdownOpen && (
                  <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"white", border:"1px solid #e5e7eb", borderRadius:"6px", maxHeight:200, overflowY:"auto", zIndex:20, marginTop:4, boxShadow:"0 4px 12px rgba(0,0,0,0.1)" }}>
                    <div style={{ padding:"8px" }}><input placeholder="Search: rah" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:"100%", padding:"6px", border:"1px solid #d1d5db", borderRadius:"4px" }} autoFocus /></div>
                    <div onClick={()=>{setSearch(""); setDoctorDropdownOpen(false)}} style={{ padding:"8px", cursor:"pointer", background: search===""?"#ecfdf5":"white" }}>All Doctors</div>
                    {doctors.map(d=>(
                      <div key={d.doctor_id} onClick={()=>{setSearch(d.full_name); setDoctorDropdownOpen(false)}} style={{ padding:"8px", cursor:"pointer" }}>Dr. {d.full_name}</div>
                    ))}
                  </div>
                )}
              </div>
              <select value={selectedDept} onChange={e=>setSelectedDept(e.target.value)} style={{ padding:"8px", border:"1px solid #d1d5db", borderRadius:"6px" }}>
                <option value="">All Departments</option>
                {departments.map(dp=> <option key={dp.department_id} value={dp.department_id}>{dp.department_name}</option>)}
              </select>
              {(search || selectedDept) && <button onClick={()=>{setSearch(""); setSelectedDept("");}} style={{ padding:"8px", border:"1px solid #d1d5db", borderRadius:"6px", cursor:"pointer" }}>Clear</button>}
            </div>
            <p style={{ fontSize:"12px", color:"#6b7280" }}>Search and department work together. Example: search "Rahim" + Cardiology shows matching Cardiology doctor(s).</p>
          </div>
          <div className="home-grid">
            {doctors.length===0 ? <p>No doctors found.</p> : doctors.map(d=>(
              <div key={d.doctor_id} className="home-card">
                {d.profile_photo && <img src={`${API}/uploads/${String(d.profile_photo).replace("/uploads/","")}`} alt={d.full_name} onError={e=>e.target.style.display='none'} />}
                {!d.profile_photo && d.profile_photo===null && null}
                <h3>Dr. {d.full_name}</h3>
                <p>{d.department_name || "-"}</p>
                <p>{d.specification || d.qualification || ""}</p>
                <p>New: ৳{d.new_patient_fee || 0} | Follow-up: ৳{d.followup_fee || 0}</p>
                <Link to={`/doctors/${d.doctor_id}`}>View Doctor</Link>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Browse by Department */}
        <section className="home-section" id="departments">
          <h2>Browse by Department</h2>
          <div className="home-dept-grid">
            {departments.map(dp=>(
              <div key={dp.department_id} className="home-dept-card" onClick={()=>handleDeptClick(dp.department_id)}>
                <strong>{dp.department_name}</strong>
                <p style={{ fontSize:"12px", color:"#6b7280" }}>{dp.description ? dp.description.slice(0,60) : ""}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Why Doctoralia */}
        <section className="home-section">
          <h2>Why Doctoralia?</h2>
          <ul className="home-why">
            <li>Find doctors easily</li>
            <li>Check availability</li>
            <li>Book appointments</li>
            <li>Manage follow-up appointments</li>
          </ul>
        </section>

        {/* 6. Emergency Contact */}
        <section className="home-section">
          <h2>Emergency Contact</h2>
          <p>Doctoralia Admin Support</p>
          <p>Email: {adminEmail || "sara@gmail.com"}</p>
        </section>

        {/* 7. Footer */}
        <footer className="home-footer">
          <p>Doctoralia — About | Contact | Help</p>
          <p>© 2026 Doctoralia</p>
        </footer>
      </div>
    </div>
  );
}

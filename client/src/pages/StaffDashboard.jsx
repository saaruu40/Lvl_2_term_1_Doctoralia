import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useInactivityLogout from "../hooks/useInactivityLogout";

import "../styles/StaffDashboard.css";

const API = "http://localhost:5000/api/staff";

function StaffDashboard() {
  const navigate = useNavigate();

  const [section, setSection] = useState("dashboard");
  const [staff, setStaff] = useState(null);
  const [stats, setStats] = useState({
    pendingAppointments: 0,
    scheduledAppointments: 0,
    confirmedAppointments: 0,
    complaints: 0,
  });

  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [myAssignment, setMyAssignment] = useState(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [notifications,setNotifications]=useState([]);

  const [complaintForm, setComplaintForm] = useState({
    against_type: "patient",
    against_id: "",
    appointment_id: "",
    complaint_type: "",
    description: "",
  });

  const logout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    navigate("/staff-login", { replace: true });
    window.location.replace("/staff-login");
  };

  const handleInactivityLogout = useCallback(() => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    localStorage.setItem("inactive_logout", "1");
    window.location.replace("/staff-login");
  }, []);
  useInactivityLogout(handleInactivityLogout, 5 * 60 * 1000);

  const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      logout();
      throw new Error("Your session has expired. Please login again.");
    }

    if (response.status === 403) {
      let data = {};

      try {
        data = await response.clone().json();
      } catch {
        data = {};
      }

      const messageText = String(data.message || "").toLowerCase();

      if (
        data.suspended_until ||
        messageText.includes("suspend") ||
        messageText.includes("permission") ||
        messageText.includes("approved")
      ) {
        localStorage.removeItem("staff");
        localStorage.removeItem("token");

        alert(
          data.message ||
            "Your staff account cannot access the dashboard right now."
        );

        navigate("/staff-login", { replace: true });
      }
    }

    return response;
  };

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const loadProfile = async () => {
    const response = await authFetch(`${API}/profile`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not load profile.");
    }

    setStaff(data.staff);

    localStorage.setItem("staff", JSON.stringify(data.staff));
  };

  const loadStats = async () => {
    const response = await authFetch(`${API}/dashboard/stats`);
    const data = await response.json();

    if (response.ok) {
      setStats(data);
    }
  };

  const loadAppointments = async () => {
    const response = await authFetch(`${API}/appointments`);
    const data = await response.json();

    if (response.ok) {
      setAppointments(data.appointments || []);
    }
  };

  const loadHospitals = async () => {
    // kept for backward compat, not used after Part1 - staff no longer selects hospital
    try {
      const response = await authFetch(`${API}/hospitals`);
      const data = await response.json();
      if (response.ok) setHospitals(data.hospitals || []);
    } catch {}
  };

  const loadComplaintTargets = async () => {
    const response = await authFetch(`${API}/complaint-targets`);
    const data = await response.json();

    if (response.ok) {
      setPatients(data.patients || []);
      setDoctors(data.doctors || []);
    }
  };

  const loadComplaints = async () => {
    const response = await authFetch(`${API}/complaints`);
    const data = await response.json();

    if (response.ok) {
      setComplaints(data.complaints || []);
    }
  };
const loadNotifications = async()=>{

try{
const storedStaff = JSON.parse(
 localStorage.getItem("staff")
);


if(!storedStaff?.staff_id)
return;

const token = localStorage.getItem("token");
const res = await axios.get(
`http://localhost:5000/api/notifications/staff/${storedStaff.staff_id}`,
{ headers: { Authorization: `Bearer ${token}` } }
);


setNotifications(
res.data.notifications
);


}

catch(error){

console.log(
"Notification error",
error
);

}

};
  const loadMyAssignment = async () => {
    try {
      const response = await authFetch(`${API}/my-assignment`);
      const data = await response.json();
      if (response.ok) setMyAssignment(data.assignment || null);
    } catch { setMyAssignment(null); }
  };

  const loadEverything = async () => {
    try {
      await Promise.all([
        loadProfile(),
        loadStats(),
        loadAppointments(),
        loadHospitals(),
        loadComplaintTargets(),
        loadComplaints(),
        loadMyAssignment(),
        loadNotifications(),
      ]);
    } catch (error) {
      if (error.message) {
        showMessage(error.message, "error");
      }
    }
  };

  useEffect(() => {
    const storedStaff = localStorage.getItem("staff");
    const token = localStorage.getItem("token");

    if (!storedStaff || !token) {
      navigate("/staff-login", { replace: true });
      return;
    }

    try {
      setStaff(JSON.parse(storedStaff));
    } catch {
      logout();
      return;
    }

    loadEverything();
  }, []);

  const approveAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await authFetch(`${API}/appointments/${appointmentId}/approve`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not approve appointment.");
      showMessage(data.message, "success");
      await Promise.all([loadAppointments(), loadStats()]);
    } catch (error) {
      showMessage(error.message, "error");
    } finally { setLoading(false); }
  };

  const rejectAppointment = async (appointmentId) => {
    try {
      setLoading(true);
      setMessage("");
      const response = await authFetch(`${API}/appointments/${appointmentId}/reject`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not reject appointment.");
      showMessage(data.message, "success");
      await Promise.all([loadAppointments(), loadStats()]);
    } catch (error) {
      showMessage(error.message, "error");
    } finally { setLoading(false); }
  };

  const submitComplaint = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await authFetch(`${API}/complaints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...complaintForm,
          appointment_id: complaintForm.appointment_id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit complaint.");
      }

      showMessage(data.message, "success");

      setComplaintForm({
        against_type: "patient",
        against_id: "",
        appointment_id: "",
        complaint_type: "",
        description: "",
      });

      await Promise.all([loadComplaints(), loadStats()]);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const complaintTargets = useMemo(() => {
    if (complaintForm.against_type === "doctor") {
      return doctors.map((doctor) => ({
        id: doctor.doctor_id,
        label: `Dr. ${doctor.full_name}${
          doctor.department_name ? ` - ${doctor.department_name}` : ""
        }`,
      }));
    }

    return patients.map((patient) => ({
      id: patient.patient_id,
      label: `${patient.full_name} - ${patient.email}`,
    }));
  }, [complaintForm.against_type, doctors, patients]);

  const pendingAppointments = appointments.filter(
    (appointment) => appointment.appointment_status === "pending"
  );

  if (!staff) {
    return <div className="staff-loading">Loading...</div>;
  }

  return (
    <div className="staff-dashboard">
      <aside className="staff-sidebar">
        <h2>Doctoralia</h2>
        <p className="staff-panel-title">Staff Panel</p>
         <Link
          to="/"
          style={{ display: "block", padding: "10px 16px", color: "inherit", textDecoration: "none" }}
        >
          🏠 Back to Home
        </Link>


        <button onClick={() => setSection("dashboard")}>Dashboard</button>

        <button onClick={() => setSection("appointments")}>
          Appointment Scheduling
          {stats.pendingAppointments > 0 && (
            <span className="staff-notification-count">
              {stats.pendingAppointments}
            </span>
          )}
        </button>

        <button onClick={() => setSection("complaints")}>
          Complaints
        </button>
      <button onClick={() => setSection("notifications")}>
          Notifications
          {notifications.length > 0 && (
            <span
              style={{
                marginLeft: "6px",
                background: "#ef4444",
                color: "white",
                borderRadius: "50%",
                padding: "2px 7px",
                fontSize: "11px",
              }}
            >
              {notifications.length}
            </span>
          )}
        </button>
        <button onClick={() => setSection("profile")}>My Profile</button>

        <button className="staff-logout-button" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="staff-main">
        {message && (
          <div className={`staff-message ${messageType}`}>{message}</div>
        )}

        {section === "dashboard" && (
          <section>
            <h1>Welcome, Staff #{staff.staff_id}</h1>
            <p>
              Manage appointment hospitals, schedules and complaint records.
            </p>

            {/* My Doctor assignment card */}
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginBottom: "16px", border: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: "0 0 8px 0" }}>My Doctor</h3>
              {myAssignment ? (
                <>
                  <p><strong>Doctor:</strong> {myAssignment.doctor_name} (ID #{myAssignment.doctor_id})</p>
                  <p><strong>Assignment:</strong> {myAssignment.assignment_type === 'PRIMARY' ? 'Primary' : 'Temporary Replacement'}</p>
                  <p><strong>Status:</strong> <span style={{ color: "green", fontWeight: 600 }}>Active</span></p>
                  {myAssignment.assignment_type === 'TEMPORARY' && myAssignment.end_date && (
                    <p><strong>Valid Until:</strong> {new Date(myAssignment.end_date).toLocaleString()}</p>
                  )}
                </>
              ) : (
                <p style={{ color: "#6b7280" }}>You are currently not assigned to any Doctor.</p>
              )}
            </div>

            <div className="staff-stats">
              <div className="staff-stat-card">
                <h3>{stats.pendingAppointments}</h3>
                <p>Pending Appointments</p>
              </div>

              <div className="staff-stat-card">
                <h3>{stats.scheduledAppointments}</h3>
                <p>Scheduled</p>
              </div>

              <div className="staff-stat-card">
                <h3>{stats.confirmedAppointments}</h3>
                <p>Confirmed</p>
              </div>

              <div className="staff-stat-card">
                <h3>{stats.complaints}</h3>
                <p>My Complaints</p>
              </div>
            </div>

            <div className="staff-dashboard-panel">
              <h2>Quick Overview</h2>
              <p>
                {myAssignment ? (
                  <>There are <strong>{pendingAppointments.length}</strong> pending appointment requests for <strong>Dr. {myAssignment.doctor_name}</strong>.</>
                ) : (
                  <>There are <strong>{pendingAppointments.length}</strong> pending appointment requests. You are not assigned to a doctor yet.</>
                )}
              </p>
            </div>
          </section>
        )}

        {section === "appointments" && (
          <section>
            <h1>My Appointments</h1>
            {!myAssignment && (
              <p style={{ background: "#fef3c7", border: "1px solid #fcd34d", padding: "10px", borderRadius: "6px" }}>You are not assigned to any doctor. Ask a doctor to assign you as Primary or Temporary staff.</p>
            )}
            <p className="staff-section-description">
              Review appointment requests and Approve or Reject. Appointment details are read-only.
            </p>

            <div className="staff-appointment-list">
              {appointments.length === 0 ? (
                <p>{myAssignment ? "No appointments for your doctor yet." : "No appointments found. You are not assigned."}</p>
              ) : (
                appointments.map((appointment) => {
                  const max = appointment.doctor_max_patients;
                  const booked = Number(appointment.currently_booked || 0);
                  const remaining = appointment.remaining_slots != null ? Number(appointment.remaining_slots) : (max != null ? Math.max(max - booked, 0) : null);
                  const isPending = appointment.appointment_status === 'pending';
                  const isFull = max != null && booked >= max;
                  return (
                  <div
                    className="staff-appointment-card"
                    key={appointment.appointment_id}
                  >
                    <div className="staff-card-top">
                      <div>
                        <h3>Appointment #{appointment.appointment_id}</h3>
                        <p>
                          <strong>Patient:</strong> {appointment.patient_name}
                        </p>
                        <p>
                          <strong>Doctor:</strong> Dr. {appointment.doctor_name}
                        </p>
                        <p>
                          <strong>Department:</strong>{" "}
                          {appointment.department_name || "-"}
                        </p>
                      </div>

                      <span
                        className={`staff-status ${appointment.appointment_status}`}
                      >
                        {appointment.appointment_status}
                      </span>
                    </div>

                    <div className="staff-appointment-info-grid">
                      <p>
                        <strong>Hospital:</strong>{" "}
                        {appointment.hospital_name || "Not assigned"}
                      </p>

                      <p>
                        <strong>Appointment Date:</strong>{" "}
                        {appointment.available_date
                          ? new Date(
                              appointment.available_date
                            ).toLocaleDateString()
                          : "Not assigned"}
                      </p>

                      <p>
                        <strong>Appointment Time:</strong>{" "}
                        {appointment.start_time && appointment.end_time
                          ? `${String(appointment.start_time).slice(
                              0,
                              5
                            )} - ${String(appointment.end_time).slice(0, 5)}`
                          : "Not assigned"}
                      </p>

                      <p>
                        <strong>Status:</strong>{" "}
                        {appointment.appointment_status}
                      </p>
                      {appointment.booking_date && (
                        <p>
                          <strong>Request Created:</strong>{" "}
                          {new Date(appointment.booking_date).toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", padding: "10px", borderRadius: "6px", marginTop: "10px" }}>
                      <strong>Schedule Capacity</strong>
                      <hr style={{ margin: "6px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />
                      <p>Doctor Max Patients: {max != null ? max : "-"}</p>
                      <p>Currently Booked: {booked}</p>
                      <p>Remaining Slots: {remaining != null ? remaining : "-"}</p>
                      {isFull && <p style={{ color: "#dc2626", fontWeight: 600, marginTop: "6px" }}>Schedule capacity reached.</p>}
                    </div>

                    {isPending && (
                      <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                        <button
                          className="staff-primary-button"
                          onClick={() => approveAppointment(appointment.appointment_id)}
                          disabled={loading || isFull}
                          title={isFull ? "This schedule has reached the doctor's maximum patient capacity." : undefined}
                          style={{ opacity: isFull ? 0.6 : 1 }}
                        >
                          {loading ? "Processing..." : "Approve"}
                        </button>
                        <button
                          className="staff-primary-button"
                          onClick={() => rejectAppointment(appointment.appointment_id)}
                          disabled={loading}
                          style={{ background: "#dc2626" }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {isFull && isPending && (
                      <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>Approve is disabled when capacity is full.</p>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {section === "complaints" && (
          <section>
            <h1>Complaints</h1>

            <form className="staff-form staff-complaint-form" onSubmit={submitComplaint}>
              <label htmlFor="against_type">Complaint Against</label>
              <select
                id="against_type"
                value={complaintForm.against_type}
                onChange={(event) =>
                  setComplaintForm({
                    ...complaintForm,
                    against_type: event.target.value,
                    against_id: "",
                  })
                }
              >
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>

              <label htmlFor="against_id">Select Person</label>
              <select
                id="against_id"
                value={complaintForm.against_id}
                onChange={(event) =>
                  setComplaintForm({
                    ...complaintForm,
                    against_id: event.target.value,
                  })
                }
                required
              >
                <option value="">Select</option>
                {complaintTargets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.label}
                  </option>
                ))}
              </select>

              <label htmlFor="appointment_id">Related Appointment (Optional)</label>
              <select
                id="appointment_id"
                value={complaintForm.appointment_id}
                onChange={(event) =>
                  setComplaintForm({
                    ...complaintForm,
                    appointment_id: event.target.value,
                  })
                }
              >
                <option value="">No appointment selected</option>
                {appointments.map((appointment) => (
                  <option
                    key={appointment.appointment_id}
                    value={appointment.appointment_id}
                  >
                    #{appointment.appointment_id} - {appointment.patient_name} / Dr. {appointment.doctor_name}
                  </option>
                ))}
              </select>

              <label htmlFor="complaint_type">Complaint Type</label>
              <input
                id="complaint_type"
                type="text"
                value={complaintForm.complaint_type}
                onChange={(event) =>
                  setComplaintForm({
                    ...complaintForm,
                    complaint_type: event.target.value,
                  })
                }
                placeholder="Example: Misconduct"
                required
              />

              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={complaintForm.description}
                onChange={(event) =>
                  setComplaintForm({
                    ...complaintForm,
                    description: event.target.value,
                  })
                }
                placeholder="Write complaint details"
                required
              />

              <button
                className="staff-primary-button"
                type="submit"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit Complaint"}
              </button>
            </form>

            <h2 className="staff-history-heading">My Complaint History</h2>

            <div className="staff-complaint-list">
              {complaints.length === 0 ? (
                <p>No complaints submitted yet.</p>
              ) : (
                complaints.map((complaint) => (
                  <div
                    className="staff-complaint-card"
                    key={complaint.complaint_id}
                  >
                    <div className="staff-card-top">
                      <h3>Complaint #{complaint.complaint_id}</h3>
                      <span
                        className={`staff-status ${complaint.complaint_status}`}
                      >
                        {complaint.complaint_status}
                      </span>
                    </div>

                    <p>
                      <strong>Against:</strong>{" "}
                      {complaint.against_patient_name
                        ? `${complaint.against_patient_name} (Patient)`
                        : complaint.against_doctor_name
                          ? `Dr. ${complaint.against_doctor_name} (Doctor)`
                          : "-"}
                    </p>

                    <p>
                      <strong>Type:</strong> {complaint.complaint_type}
                    </p>
                    <p>{complaint.description}</p>

                    {complaint.appointment_id && (
                      <p>
                        <strong>Appointment:</strong> #{complaint.appointment_id}
                      </p>
                    )}

                    {complaint.admin_action && (
                      <p>
                        <strong>Admin Action:</strong> {complaint.admin_action}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        )}
{/* <div className="notification-box">

<h3>
Notifications
</h3>


{
notifications.length===0?

<p>No notifications</p>

:

notifications.map((n)=>(

<div key={n.notification_id}>

<h4>
{n.title}
</h4>

<p>
{n.message}
</p>

<small>
{new Date(n.created_at).toLocaleString()}
</small>

</div>

))

}


</div> */}
        {/* NOTIFICATIONS */}

        {section === "notifications" && (
          <section>
            <h1>Notifications</h1>

            <div className="notification-box">

              {notifications.length === 0 ? (

                <p>No notifications</p>

              ) : (

                notifications.map((n) => (

                  <div
                    key={n.notification_id}
                    style={{
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "10px",
                    }}
                  >
                    <h4 style={{ margin: "0 0 6px 0" }}>{n.title}</h4>
                    <p style={{ margin: "0 0 6px 0" }}>{n.message}</p>
                    <small style={{ color: "#6b7280" }}>
                      {new Date(n.created_at).toLocaleString()}
                    </small>
                  </div>

                ))

              )}

            </div>

          </section>
        )}
        {section === "profile" && (
          <section>
            <h1>My Profile</h1>

            <div className="staff-profile-card">
              {staff.profile_pic ? (
                <img
                  className="staff-profile-image"
                  src={`http://localhost:5000${staff.profile_pic}`}
                  alt="Staff"
                />
              ) : (
                <div className="staff-profile-placeholder">
                  {String(staff.staff_id).slice(-2)}
                </div>
              )}

              <h2>Staff #{staff.staff_id}</h2>

              <div className="staff-profile-details">
                <p>
                  <strong>Email</strong>
                  <span>{staff.email}</span>
                </p>
                <p>
                  <strong>Phone</strong>
                  <span>{staff.phone_number || "-"}</span>
                </p>
                <p>
                  <strong>Gender</strong>
                  <span>{staff.gender || "-"}</span>
                </p>
                <p>
                  <strong>Status</strong>
                  <span>{staff.approval_status || "approved"}</span>
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default StaffDashboard;

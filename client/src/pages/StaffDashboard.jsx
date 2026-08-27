import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    hospital_id: "",
    available_date: "",
    start_time: "",
    end_time: "",
  });

  const [complaintForm, setComplaintForm] = useState({
    against_type: "patient",
    against_id: "",
    appointment_id: "",
    complaint_type: "",
    description: "",
  });

  const logout = () => {
    localStorage.removeItem("staff");
    localStorage.removeItem("token");
    navigate("/staff-login", { replace: true });
  };

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
    const response = await authFetch(`${API}/hospitals`);
    const data = await response.json();

    if (response.ok) {
      setHospitals(data.hospitals || []);
    }
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

  const loadEverything = async () => {
    try {
      await Promise.all([
        loadProfile(),
        loadStats(),
        loadAppointments(),
        loadHospitals(),
        loadComplaintTargets(),
        loadComplaints(),
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

  const openScheduleForm = (appointment) => {
    setSelectedAppointment(appointment);

    setScheduleForm({
      hospital_id: appointment.hospital_id
        ? String(appointment.hospital_id)
        : "",
      available_date: appointment.available_date
        ? String(appointment.available_date).split("T")[0]
        : "",
      start_time: appointment.start_time
        ? String(appointment.start_time).slice(0, 5)
        : "",
      end_time: appointment.end_time
        ? String(appointment.end_time).slice(0, 5)
        : "",
    });
  };

  const submitSchedule = async (event) => {
    event.preventDefault();

    if (!selectedAppointment) return;

    try {
      setLoading(true);
      setMessage("");

      const response = await authFetch(
        `${API}/appointments/${selectedAppointment.appointment_id}/schedule`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(scheduleForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not schedule appointment.");
      }

      showMessage(data.message, "success");
      setSelectedAppointment(null);

      await Promise.all([loadAppointments(), loadStats()]);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
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
                There are <strong>{pendingAppointments.length}</strong> pending
                appointment requests waiting for hospital and schedule
                assignment.
              </p>
            </div>
          </section>
        )}

        {section === "appointments" && (
          <section>
            <h1>Appointment Scheduling</h1>
            <p className="staff-section-description">
              Select a hospital, date and time for each patient appointment.
            </p>

            <div className="staff-appointment-list">
              {appointments.length === 0 ? (
                <p>No appointments found.</p>
              ) : (
                appointments.map((appointment) => (
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
                        <strong>Date:</strong>{" "}
                        {appointment.available_date
                          ? new Date(
                              appointment.available_date
                            ).toLocaleDateString()
                          : "Not assigned"}
                      </p>

                      <p>
                        <strong>Time:</strong>{" "}
                        {appointment.start_time && appointment.end_time
                          ? `${String(appointment.start_time).slice(
                              0,
                              5
                            )} - ${String(appointment.end_time).slice(0, 5)}`
                          : "Not assigned"}
                      </p>

                      <p>
                        <strong>Payment:</strong>{" "}
                        {appointment.payment_status || "Not paid"}
                      </p>
                    </div>

                    {["pending", "scheduled"].includes(
                      appointment.appointment_status
                    ) && (
                      <button
                        className="staff-primary-button"
                        onClick={() => openScheduleForm(appointment)}
                      >
                        {appointment.appointment_status === "scheduled"
                          ? "Edit Schedule"
                          : "Set Hospital & Schedule"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedAppointment && (
              <div className="staff-modal">
                <div className="staff-modal-content">
                  <button
                    className="staff-close-button"
                    type="button"
                    onClick={() => setSelectedAppointment(null)}
                  >
                    ×
                  </button>

                  <h2>
                    Schedule Appointment #{selectedAppointment.appointment_id}
                  </h2>

                  <p>
                    <strong>Patient:</strong>{" "}
                    {selectedAppointment.patient_name}
                  </p>
                  <p>
                    <strong>Doctor:</strong> Dr. {selectedAppointment.doctor_name}
                  </p>

                  <form className="staff-form" onSubmit={submitSchedule}>
                    <label htmlFor="hospital_id">Hospital</label>
                    <select
                      id="hospital_id"
                      value={scheduleForm.hospital_id}
                      onChange={(event) =>
                        setScheduleForm({
                          ...scheduleForm,
                          hospital_id: event.target.value,
                        })
                      }
                      required
                    >
                      <option value="">Select hospital</option>
                      {hospitals.map((hospital) => (
                        <option
                          key={hospital.hospital_id}
                          value={hospital.hospital_id}
                        >
                          {hospital.hospital_name} - {hospital.city}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="available_date">Appointment Date</label>
                    <input
                      id="available_date"
                      type="date"
                      value={scheduleForm.available_date}
                      onChange={(event) =>
                        setScheduleForm({
                          ...scheduleForm,
                          available_date: event.target.value,
                        })
                      }
                      required
                    />

                    <div className="staff-time-grid">
                      <div>
                        <label htmlFor="start_time">Start Time</label>
                        <input
                          id="start_time"
                          type="time"
                          value={scheduleForm.start_time}
                          onChange={(event) =>
                            setScheduleForm({
                              ...scheduleForm,
                              start_time: event.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="end_time">End Time</label>
                        <input
                          id="end_time"
                          type="time"
                          value={scheduleForm.end_time}
                          onChange={(event) =>
                            setScheduleForm({
                              ...scheduleForm,
                              end_time: event.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    </div>

                    <button
                      className="staff-primary-button staff-full-button"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Saving..." : "Save Schedule"}
                    </button>
                  </form>
                </div>
              </div>
            )}
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

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/PatientDashboard.css";
import useInactivityLogout from "../hooks/useInactivityLogout";

const API =
  "http://localhost:5000/api/patients";

  const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};


function PatientDashboard() {

  const navigate = useNavigate();

  const [section, setSection] =
    useState("dashboard");

  const [patient, setPatient] =
    useState(null);

  const [doctors, setDoctors] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  const [staff, setStaff] =
    useState([]);

  const [appointments, setAppointments] =
    useState([]);

  const [complaints, setComplaints] =
    useState([]);

    const [prescriptions, setPrescriptions] =
  useState([]);

const [referrals, setReferrals] =
  useState([]);

  const [selectedDepartment,
    setSelectedDepartment] =
    useState("");

  const [doctorSearch,
    setDoctorSearch] =
    useState("");

  const [selectedDoctor,
    setSelectedDoctor] =
    useState(null);
  const [notifications,setNotifications]=useState([]);
  // New booking flow: Date -> Doctors -> Schedules
  const [bookingDate, setBookingDate] = useState("");
  const [bookingDoctors, setBookingDoctors] = useState([]);
  const [bookingDoctorId, setBookingDoctorId] = useState("");
  const [bookingSchedules, setBookingSchedules] = useState([]);
  const [bookingScheduleId, setBookingScheduleId] = useState("");

  const loadNotifications = async()=>{

try{

const res = await axios.get(
`http://localhost:5000/api/notifications/patient/${patient.patient_id}`
);

console.log("Notification data:", res.data.notifications);
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

  const loadBookingDoctors = async (date) => {
    if (!date) { setBookingDoctors([]); return; }
    try {
      const params = new URLSearchParams({ date });
      if (selectedDepartment) params.append("department_id", selectedDepartment);
      const res = await authFetch(`${API}/doctors/available-by-date?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setBookingDoctors(data.doctors || []);
      else setBookingDoctors([]);
    } catch { setBookingDoctors([]); }
  };
  const loadBookingSchedules = async (doctorId, date) => {
    if (!doctorId || !date) { setBookingSchedules([]); return; }
    try {
      const res = await authFetch(`${API}/doctors/${doctorId}/schedules/by-date?date=${date}`);
      const data = await res.json();
      if (res.ok) setBookingSchedules(data.schedules || []);
      else setBookingSchedules([]);
    } catch { setBookingSchedules([]); }
  };
  const bookAppointmentWithSchedule = async () => {
    if (!bookingDate || !bookingDoctorId || !bookingScheduleId) {
      setMessage("Select date, doctor and schedule."); return;
    }
    if (!window.confirm("Confirm appointment?")) return;
    try {
      const response = await authFetch(`${API}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.patient_id, doctor_id: Number(bookingDoctorId), schedule_id: Number(bookingScheduleId) }),
      });
      const data = await response.json();
      setMessage(data.message);
      if (response.status === 403) { localStorage.removeItem("patient"); alert(data.message); navigate("/patient-login",{replace:true}); return; }
      if (response.ok) { await loadAppointments(); setSection("appointments"); setBookingScheduleId(""); }
    } catch { setMessage("Could not submit appointment."); }
  };

  const [message, setMessage] =
    useState("");

  const [profileForm,
    setProfileForm] =
    useState({
      full_name: "",
      phone_number: "",
      gender: "",
      date_of_birth: "",
      blood_group: "",
      address: "",
    });

  const [complaintForm,
    setComplaintForm] =
    useState({
      against_type: "doctor",
      against_id: "",
      complaint_type: "",
      description: "",
      appointment_id: "",
    });


  // ======================================
  // LOAD LOGGED IN PATIENT
  // ======================================

  useEffect(() => {

    const stored =
      localStorage.getItem("patient");

    if (!stored) {
      navigate("/patient-login");
      return;
    }

    const parsed =
      JSON.parse(stored);

    setPatient(parsed);

  }, [navigate]);


  // ======================================
  // LOAD EVERYTHING
  // ======================================

  useEffect(() => {

    if (!patient?.patient_id) {
      return;
    }

    loadProfile();
    loadDoctors();
    loadDepartments();
    loadAppointments();
    loadComplaints();
    loadStaff();
    loadPrescriptions();
loadReferrals();
loadNotifications();

  }, [patient?.patient_id]);


  // ======================================
  // PROFILE
  // ======================================

  const loadProfile = async () => {

    try {

      const response =
        await authFetch(
          `${API}/profile/${patient.patient_id}`
        );

      const data =
        await response.json();

      if (response.ok) {

        setPatient((old) => ({
          ...old,
          ...data.patient,
        }));

        setProfileForm({
          full_name:
            data.patient.full_name || "",

          phone_number:
            data.patient.phone_number || "",

          gender:
            data.patient.gender || "",

          date_of_birth:
            data.patient.date_of_birth
              ? data.patient.date_of_birth
                  .split("T")[0]
              : "",

          blood_group:
            data.patient.blood_group || "",

          address:
            data.patient.address || "",
        });
      }

    } catch (error) {
      console.error(error);
    }
  };


  // ======================================
  // DOCTORS
  // ======================================

  const loadDoctors = async () => {

    try {

      const params =
        new URLSearchParams();

      if (selectedDepartment) {
        params.append(
          "department_id",
          selectedDepartment
        );
      }

      if (doctorSearch.trim()) {
        params.append(
          "search",
          doctorSearch.trim()
        );
      }

      let url = `${API}/doctors`;

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response =
        await authFetch(url);

      const data =
        await response.json();

      if (response.ok) {
        setDoctors(
          data.doctors || []
        );
      }

    } catch (error) {
      console.error(error);
    }
  };


  useEffect(() => {

    if (patient?.patient_id) {
      loadDoctors();
    }

  }, [
    selectedDepartment,
    doctorSearch,
    patient?.patient_id,
  ]);


  // ======================================
  // DEPARTMENTS
  // ======================================

  const loadDepartments = async () => {

    try {

      const response =
        await authFetch(
          `${API}/departments`
        );

      const data =
        await response.json();

      if (response.ok) {
        setDepartments(
          data.departments || []
        );
      }

    } catch (error) {
      console.error(error);
    }
  };


  // ======================================
  // STAFF
  // ======================================

  const loadStaff = async () => {

    try {

      const response =
        await authFetch(`${API}/staff`);

      const data =
        await response.json();

      if (response.ok) {
        setStaff(data.staff || []);
      }

    } catch (error) {
      console.error(error);
    }
  };


  // ======================================
  // APPOINTMENTS
  // ======================================

  const loadAppointments = async () => {

    try {

      const response =
        await authFetch(
          `${API}/${patient.patient_id}/appointments`
        );

      const data =
        await response.json();

      if (response.ok) {
        setAppointments(
          data.appointments || []
        );
      }

    } catch (error) {
      console.error(error);
    }
  };
   // ======================================
// PRESCRIPTIONS
// ======================================

const loadPrescriptions = async () => {
  try {

    const response = await authFetch(
      `${API}/prescriptions`
    );

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("patient");
      localStorage.removeItem("token");

      alert(
        data.message ||
        "You cannot access your account."
      );

      navigate("/patient-login", {
        replace: true,
      });

      return;
    }

    if (response.ok) {
      setPrescriptions(
        data.prescriptions || []
      );
    }

  } catch (error) {
    console.error(
      "Prescription load error:",
      error
    );
  }
};


// ======================================
// REFERRALS
// ======================================

const loadReferrals = async () => {
  try {

    const response = await authFetch(
      `${API}/referrals`
    );

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("patient");
      localStorage.removeItem("token");

      alert(
        data.message ||
        "You cannot access your account."
      );

      navigate("/patient-login", {
        replace: true,
      });

      return;
    }

    if (response.ok) {
      setReferrals(
        data.referrals || []
      );
    }

  } catch (error) {
    console.error(
      "Referral load error:",
      error
    );
  }
};

  // ======================================
  // BOOK APPOINTMENT
  // ======================================

  const bookAppointment =
    async (doctorId) => {

      if (
        !window.confirm(
          "Do you want to request an appointment with this doctor?"
        )
      ) {
        return;
      }

      try {

        const response =
          await authFetch(
            `${API}/appointments`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                patient_id:
                  patient.patient_id,

                doctor_id:
                  doctorId,
              }),
            }
          );

        const data =
          await response.json();

        setMessage(data.message);

        // if (response.status === 403) {

        //   navigate("/suspended");

        //   return;
        // }
        if (response.status === 403) {
  localStorage.removeItem("patient");

  alert(
    data.message ||
      "Your account is temporarily suspended."
  );

  navigate("/patient-login", {
    replace: true,
  });

  return;
}

        if (response.ok) {

          await loadAppointments();

          setSection(
            "appointments"
          );

        }

      } catch (error) {

        setMessage(
          "Could not submit appointment."
        );
      }
    };


  // ======================================
  // CANCEL APPOINTMENT
  // ======================================

  const cancelAppointment =
    async (appointmentId) => {

      if (
        !window.confirm(
          "Cancel this appointment request?"
        )
      ) {
        return;
      }

      try {

        const response =
          await authFetch(
            `${API}/appointments/${appointmentId}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await response.json();

        setMessage(data.message);

        if (response.ok) {
          loadAppointments();
        }

      } catch (error) {

        setMessage(
          "Could not cancel appointment."
        );
      }
    };


 
  const makePayment = async (appointmentId) => {
  try {
    setMessage("Processing payment...");

    const response = await authFetch(
      `${API}/payments`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          patient_id: patient.patient_id,
          appointment_id: appointmentId,
          payment_method: "cash",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(
        data.message || "Payment failed."
      );
      return;
    }

    setMessage(
      `${data.message} Fee: ${data.fee_type}, Amount: ৳${data.amount}`
    );

    await loadAppointments();

  } catch (error) {
    console.error(
      "Payment error:",
      error
    );

    setMessage(
      "Payment failed. Please try again."
    );
  }
};


  // ======================================
  // COMPLAINTS
  // ======================================

  const loadComplaints = async () => {

    try {

      const response =
        await authFetch(
          `${API}/${patient.patient_id}/complaints`
        );

      const data =
        await response.json();

      if (response.ok) {
        setComplaints(
          data.complaints || []
        );
      }

    } catch (error) {
      console.error(error);
    }
  };


  const submitComplaint =
    async (e) => {

      e.preventDefault();

      try {

        const response =
          await authFetch(
            `${API}/complaints`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                patient_id:
                  patient.patient_id,

                against_type:
                  complaintForm
                    .against_type,

                against_id:
                  complaintForm
                    .against_id,

                appointment_id:
                  complaintForm
                    .appointment_id ||
                  null,

                complaint_type:
                  complaintForm
                    .complaint_type,

                description:
                  complaintForm
                    .description,
              }),
            }
          );

        const data =
          await response.json();

        setMessage(data.message);

        if (response.ok) {

          setComplaintForm({
            against_type:
              "doctor",

            against_id: "",

            complaint_type: "",

            description: "",

            appointment_id: "",
          });

          loadComplaints();
        }

      } catch (error) {

        setMessage(
          "Could not submit complaint."
        );
      }
    };


  // ======================================
  // UPDATE PROFILE
  // ======================================

  const updateProfile =
    async (e) => {

      e.preventDefault();

      try {

        const response =
          await authFetch(
            `${API}/profile/${patient.patient_id}`,
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                profileForm
              ),
            }
          );

        const data =
          await response.json();

        setMessage(data.message);

        if (response.ok) {

          const updated = {
            ...patient,
            ...data.patient,
          };

          setPatient(updated);

          localStorage.setItem(
            "patient",
            JSON.stringify(updated)
          );
        }

      } catch (error) {

        setMessage(
          "Could not update profile."
        );
      }
    };


  // auto logout on inactivity (15 min) — frontend UX, backend JWT 1d still authoritative
  const handleInactivityLogout = useCallback(() => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    localStorage.setItem("inactive_logout", "1");
    window.location.replace("/patient-login");
  }, []);
  useInactivityLogout(handleInactivityLogout, 5 * 60 * 1000);

  // ======================================
  // LOGOUT
  // ======================================

  const logout = () => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    navigate("/patient-login");
    window.location.replace("/patient-login");
  };


  if (!patient) {
    return (
      <div>
        Loading...
      </div>
    );
  }


  return (

    <div className="patient-dashboard">

      {/* SIDEBAR */}

      <aside className="patient-sidebar">

        <h2>Doctoralia</h2>

        <p className="patient-panel-title">
          Patient Panel
        </p>


        <button
          onClick={() =>
            setSection("dashboard")
          }
        >
          Dashboard
        </button>


        <button
          onClick={() =>
            setSection("doctors")
          }
        >
          Find Doctors
        </button>


        <button
          onClick={() =>
            setSection("appointments")
          }
        >
          My Appointments
        </button>

    <button
  onClick={() =>
    setSection("prescriptions")
  }
>
  My Prescriptions
</button>


<button
  onClick={() =>
    setSection("referrals")
  }
>
  My Referrals
</button>
        <button
          onClick={() =>
            setSection("complaints")
          }
        >
          Complaints
        </button>


        <button
          onClick={() =>
            setSection("profile")
          }
        >
          My Profile
        </button>


        <button
          className="logout-button"
          onClick={logout}
        >
          Logout
        </button>

      </aside>


      {/* MAIN */}

      <main className="patient-main">

        {message && (
          <div className="patient-message">
            {message}
          </div>
        )}


        {/* DASHBOARD */}

        {section === "dashboard" && (

          <section>

            <h1>
              Welcome, {patient.full_name}
            </h1>

            <p>
              Manage your doctors,
              appointments, payments
              and complaints.
            </p>


            <div className="patient-stats">

              <div className="stat-card">
                <h3>
                  {
                    appointments.length
                  }
                </h3>

                <p>
                  Total Appointments
                </p>
              </div>


              <div className="stat-card">
                <h3>
                  {
                    appointments.filter(
                      (a) =>
                        a.appointment_status ===
                        "pending"
                    ).length
                  }
                </h3>

                <p>
                  Pending
                </p>
              </div>


              <div className="stat-card">
                <h3>
                  {
                    appointments.filter(
                      (a) =>
                        a.appointment_status ===
                        "confirmed"
                    ).length
                  }
                </h3>

                <p>
                  Confirmed
                </p>
              </div>


              <div className="stat-card">
                <h3>
                  {
                    complaints.length
                  }
                </h3>

                <p>
                  Complaints
                </p>
              </div>

            </div>

          </section>
        )}


        {/* FIND DOCTORS */}

        {section === "doctors" && (

          <section>

            <h1>
              Find Doctors
            </h1>

            {/* New booking flow: Date -> Doctors -> Schedules */}
            <div style={{ background:"white", padding:"16px", borderRadius:"12px", border:"1px solid #e5e7eb", marginBottom:"16px" }}>
              <h3 style={{ margin:"0 0 10px 0" }}>Book Appointment: Select Date → Doctor → Schedule</h3>
              <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", alignItems:"end" }}>
                <div>
                  <label>Appointment Date *</label><br />
                  <input type="date" value={bookingDate} onChange={(e)=>{ setBookingDate(e.target.value); setBookingDoctorId(""); setBookingScheduleId(""); setBookingSchedules([]); if(e.target.value) loadBookingDoctors(e.target.value); else setBookingDoctors([]); }} style={{ padding:"8px", border:"1px solid #d1d5db", borderRadius:"6px" }} />
                </div>
                <div>
                  <label>Available Doctors *</label><br />
                  <select value={bookingDoctorId} onChange={(e)=>{ const val=e.target.value; setBookingDoctorId(val); setBookingScheduleId(""); if(val && bookingDate) loadBookingSchedules(val, bookingDate); else setBookingSchedules([]); }} style={{ padding:"8px", border:"1px solid #d1d5db", borderRadius:"6px", minWidth:"200px" }}>
                    <option value="">{bookingDate ? (bookingDoctors.length ? "Select Doctor" : "No doctors for this date") : "Select date first"}</option>
                    {bookingDoctors.map(d=> <option key={d.doctor_id} value={d.doctor_id}>Dr. {d.full_name} - {d.department_name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Available Schedule *</label><br />
                  <select value={bookingScheduleId} onChange={(e)=> setBookingScheduleId(e.target.value)} style={{ padding:"8px", border:"1px solid #d1d5db", borderRadius:"6px", minWidth:"200px" }}>
                    <option value="">{bookingDoctorId ? (bookingSchedules.length ? "Select Schedule" : "No schedules") : "Select doctor first"}</option>
                    {bookingSchedules.map(s=> <option key={s.schedule_id} value={s.schedule_id}>{String(s.available_date).split("T")[0]} {String(s.start_time).slice(0,5)}-{String(s.end_time).slice(0,5)} {s.hospital_name?`@ ${s.hospital_name}`:""}</option>)}
                  </select>
                </div>
                <button onClick={bookAppointmentWithSchedule} disabled={!bookingDate || !bookingDoctorId || !bookingScheduleId} style={{ padding:"9px 14px", background: (!bookingDate || !bookingDoctorId || !bookingScheduleId) ? "#9ca3af" : "#0f766e", color:"white", border:"none", borderRadius:"6px", cursor: (!bookingDate || !bookingDoctorId || !bookingScheduleId) ? "not-allowed":"pointer" }}>Confirm Appointment</button>
              </div>
              {bookingScheduleId && (()=>{ const s=bookingSchedules.find(x=>String(x.schedule_id)===String(bookingScheduleId)); const doc=bookingDoctors.find(d=>String(d.doctor_id)===String(bookingDoctorId)); if(!s) return null; return (
                <div style={{ marginTop:"12px", background:"#ecfdf5", border:"1px solid #6ee7b7", padding:"12px", borderRadius:"8px" }}>
                  <h4 style={{ margin:"0 0 6px 0", color:"#065f46" }}>Selected Appointment</h4>
                  <p><strong>Doctor:</strong> Dr. {doc?.full_name || bookingDoctorId}</p>
                  <p><strong>Date:</strong> {String(s.available_date).split("T")[0]}</p>
                  <p><strong>Time:</strong> {String(s.start_time).slice(0,5)} - {String(s.end_time).slice(0,5)}</p>
                  <p><strong>Status:</strong> Available</p>
                  <p><strong>Hospital:</strong> {s.hospital_name || s.hospital_id || "-"}</p>
                </div>
              ); })()}
              <p style={{ fontSize:"12px", color:"#6b7280", marginTop:"8px" }}>Doctors shown have available schedules on the selected date. Schedules are fetched via backend filtering.</p>
            </div>

            <h3 style={{ marginTop:"10px" }}>Or browse all doctors</h3>
            <div className="doctor-filters">

              <select
                value={
                  selectedDepartment
                }

                onChange={(e) =>
                  setSelectedDepartment(
                    e.target.value
                  )
                }
              >

                <option value="">
                  All Departments
                </option>

                {departments.map(
                  (department) => (

                    <option
                      key={
                        department.department_id
                      }

                      value={
                        department.department_id
                      }
                    >
                      {
                        department.department_name
                      }
                    </option>

                  )
                )}

              </select>


              <input
                type="text"

                placeholder="Search doctor..."

                value={doctorSearch}

                onChange={(e) =>
                  setDoctorSearch(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="doctor-grid">

              {doctors.map(
                (doctor) => (

                  <div
                    className="doctor-card"

                    key={
                      doctor.doctor_id
                    }
                  >

                    {doctor.profile_photo && (

                      <img
                        src={`http://localhost:5000/uploads/${doctor.profile_photo}`}
                        alt={doctor.full_name}
                      />

                    )}


                    <h3>
                      Dr. {doctor.full_name}
                    </h3>


                    <p>
                      <strong>
                        Department:
                      </strong>{" "}
                      {
                        doctor.department_name
                      }
                    </p>


                    <p>
                      <strong>
                        Specialization:
                      </strong>{" "}
                      {
                        doctor.specification
                      }
                    </p>


                    <p>
                      New Patient Fee:
                      {" "}৳
                      {
                        doctor.new_patient_fee
                      }
                    </p>


                    <p>
                      Follow-up Fee:
                      {" "}৳
                      {
                        doctor.followup_fee
                      }
                    </p>


                    <button
                      onClick={() =>
                        setSelectedDoctor(
                          doctor
                        )
                      }
                    >
                      View Biodata
                    </button>

                  </div>

                )
              )}

            </div>


            {selectedDoctor && (

              <div className="doctor-modal">

                <div className="doctor-modal-content">

                  <button
                    className="close-button"

                    onClick={() =>
                      setSelectedDoctor(
                        null
                      )
                    }
                  >
                    ×
                  </button>


                  <h2>
                    Dr. {
                      selectedDoctor.full_name
                    }
                  </h2>


                  <p>
                    Department:
                    {" "}
                    {
                      selectedDoctor.department_name
                    }
                  </p>


                  <p>
                    Qualification:
                    {" "}
                    {
                      selectedDoctor.qualification
                    }
                  </p>


                  <p>
                    Specialization:
                    {" "}
                    {
                      selectedDoctor.specification
                    }
                  </p>


                  <p>
                    Medical Registration:
                    {" "}
                    {
                      selectedDoctor
                        .medical_registration_no
                    }
                  </p>


                  <p>
                    Phone:
                    {" "}
                    {
                      selectedDoctor.phone_number
                    }
                  </p>


                  <p>
                    New Patient Fee:
                    {" "}৳
                    {
                      selectedDoctor
                        .new_patient_fee
                    }
                  </p>


                  <p>
                    Follow-up Fee:
                    {" "}৳
                    {
                      selectedDoctor
                        .followup_fee
                    }
                  </p>


                  <p style={{ fontSize:"12px", color:"#6b7280", marginTop:"10px" }}>To book, use the date → doctor → schedule flow at the top and Confirm Appointment.</p>
                </div>

              </div>
            )}

          </section>
        )}

 <div className="notification-box">

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


</div>
        {/* APPOINTMENTS */}

        {section === "appointments" && (

          <section>

            <h1>
              My Appointments
            </h1>


            <div className="appointment-list">

              {appointments.length === 0 ? (

                <p>
                  No appointments found.
                </p>

              ) : (

                appointments.map(
                  (appointment) => (

                    <div
                      className="appointment-card"

                      key={
                        appointment.appointment_id
                      }
                    >

                      <h3>
                        Dr. {
                          appointment.doctor_name
                        }
                      </h3>


                      <p>
                        Department:
                        {" "}
                        {
                          appointment.department_name
                        }
                      </p>


                      <p>
                        Status:
                        {" "}
                        <strong>
                          {
                            appointment
                              .appointment_status
                          }
                        </strong>
                      </p>


                      <p>
                        Hospital:
                        {" "}
                        {
                          appointment
                            .hospital_name ||
                          "Waiting for staff assignment"
                        }
                      </p>


                      <p>
                        Date:
                        {" "}
                        {
                          appointment
                            .available_date
                            ? new Date(
                                appointment
                                  .available_date
                              )
                                .toLocaleDateString()
                            : "Waiting for staff assignment"
                        }
                      </p>


                      <p>
                        Time:
                        {" "}
                        {
                          appointment
                            .start_time &&
                          appointment
                            .end_time

                            ? `${String(appointment.start_time).slice(0,5)} - ${String(appointment.end_time).slice(0,5)}`

                            : "Waiting for staff assignment"
                        }
                      </p>

                      <p>
                        Appointment Request Created:
                        {" "}
                        {appointment.booking_date ? new Date(appointment.booking_date).toLocaleString() : "-"}
                      </p>


                      {appointment
                        .payment_status ===
                        "paid" && (

                        <p>
                          Payment:
                          {" "}৳
                          {
                            appointment.amount
                          }
                          {" "}
                          (Paid)
                        </p>

                      )}


                      {appointment
                        .appointment_status ===
                        "pending" && (

                        <button
                          onClick={() =>
                            cancelAppointment(
                              appointment
                                .appointment_id
                            )
                          }
                        >
                          Cancel Request
                        </button>

                      )}


                      {appointment
                        .appointment_status ===
                        "scheduled" && (

                        <button
                          onClick={() =>
                            makePayment(
                              appointment
                                .appointment_id
                            )
                          }
                        >
                          Pay Now
                        </button>

                      )}

                    </div>

                  )
                )

              )}

            </div>

          </section>
        )}

   {/* PRESCRIPTIONS */}

{section === "prescriptions" && (

  <section>

    <h1>
      My Prescriptions
    </h1>


    {prescriptions.length === 0 ? (

      <p>
        No prescriptions found.
      </p>

    ) : (

      <div className="prescription-list">

        {prescriptions.map(
          (prescription) => (

            <div
              className="prescription-card"

              key={
                prescription
                  .prescription_id
              }
            >

              <h3>
                Prescription #
                {
                  prescription
                    .prescription_id
                }
              </h3>


              <p>
                <strong>
                  Appointment ID:
                </strong>{" "}
                #
                {
                  prescription
                    .appointment_id
                }
              </p>


              <p>
                <strong>
                  Doctor:
                </strong>{" "}
                Dr.{" "}
                {
                  prescription
                    .doctor_name
                }
              </p>


              <p>
                <strong>
                  Department:
                </strong>{" "}
                {
                  prescription
                    .department_name ||
                  "-"
                }
              </p>


              <p>
                <strong>
                  Hospital:
                </strong>{" "}
                {
                  prescription
                    .hospital_name ||
                  "-"
                }
              </p>


              <p>
                <strong>
                  Date:
                </strong>{" "}

                {
                  prescription
                    .available_date

                    ? new Date(
                        prescription
                          .available_date
                      )
                        .toLocaleDateString()

                    : "-"
                }
              </p>


              <div className="prescription-details">

                <h4>
                  Diagnosis
                </h4>

                <p>
                  {
                    prescription
                      .diagnosis
                  }
                </p>


                <h4>
                  Advice
                </h4>

                <p>
                  {
                    prescription
                      .advice ||
                    "No additional advice."
                  }
                </p>

              </div>


              <h4>
                Medicines
              </h4>


              {
                prescription
                  .medicines
                  ?.length > 0
                  ? (

                    <div className="medicine-list">

                      {
                        prescription
                          .medicines
                          .map(
                            (
                              medicine,
                              index
                            ) => (

                              <div
                                className="medicine-item"
                                key={
                                  `${medicine.medicine_id}-${index}`
                                }
                              >

                                <strong>
                                  {
                                    medicine
                                      .medicine_name
                                  }
                                  {" "}
                                  {
                                    medicine
                                      .strength ||
                                    ""
                                  }
                                </strong>


                                <p>
                                  Dosage:{" "}
                                  {
                                    medicine
                                      .dosage ||
                                    "-"
                                  }
                                </p>

                                <p>
                                  Frequency:{" "}
                                  {
                                    medicine
                                      .frequency ||
                                    "-"
                                  }
                                </p>

                                <p>
                                  Duration:{" "}
                                  {
                                    medicine
                                      .duration ||
                                    "-"
                                  }
                                </p>

                                <p>
                                  Instruction:{" "}
                                  {
                                    medicine
                                      .instruction ||
                                    "-"
                                  }
                                </p>

                              </div>
                            )
                          )
                      }

                    </div>

                  ) : (

                    <p>
                      No medicines prescribed.
                    </p>
                  )
              }


              <h4>
                Suggested Tests
              </h4>


              {
                prescription
                  .tests
                  ?.length > 0
                  ? (

                    <div className="test-list">

                      {
                        prescription
                          .tests
                          .map(
                            (
                              test,
                              index
                            ) => (

                              <div
                                className="test-item"
                                key={
                                  `${test.test_id}-${index}`
                                }
                              >

                                <strong>
                                  {
                                    test
                                      .test_name
                                  }
                                </strong>

                                {
                                  test
                                    .description && (

                                    <p>
                                      {
                                        test
                                          .description
                                      }
                                    </p>
                                  )
                                }

                              </div>
                            )
                          )
                      }

                    </div>

                  ) : (

                    <p>
                      No tests suggested.
                    </p>
                  )
              }


              <p>
                <strong>
                  Created:
                </strong>{" "}

                {
                  prescription
                    .created_at

                    ? new Date(
                        prescription
                          .created_at
                      )
                        .toLocaleString()

                    : "-"
                }
              </p>

            </div>

          )
        )}

      </div>
    )}

  </section>
)}
        {/* COMPLAINTS */}

        {section === "complaints" && (

          <section>

            <h1>
              Complaints
            </h1>


            <form
              className="complaint-form"

              onSubmit={
                submitComplaint
              }
            >

              <label>
                Complaint Against
              </label>


              <select
                value={
                  complaintForm
                    .against_type
                }

                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,

                    against_type:
                      e.target.value,

                    against_id: "",
                  })
                }
              >

                <option value="doctor">
                  Doctor
                </option>

                <option value="staff">
                  Staff
                </option>

              </select>


              <label>
                Select Person
              </label>


              <select
                value={
                  complaintForm
                    .against_id
                }

                required

                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,

                    against_id:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select
                </option>


                {complaintForm
                  .against_type ===
                  "doctor"

                  ? doctors.map(
                      (doctor) => (

                        <option
                          key={
                            doctor.doctor_id
                          }

                          value={
                            doctor.doctor_id
                          }
                        >
                          Dr. {
                            doctor.full_name
                          }
                        </option>

                      )
                    )

                  : staff.map(
                      (item) => (

                        <option
                          key={
                            item.staff_id
                          }

                          value={
                            item.staff_id
                          }
                        >
                          Staff #{item.staff_id}
                          {" - "}
                          {item.email}
                        </option>

                      )
                    )
                }

              </select>


              <label>
                Complaint Type
              </label>


              <input
                type="text"

                required

                value={
                  complaintForm
                    .complaint_type
                }

                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,

                    complaint_type:
                      e.target.value,
                  })
                }
              />


              <label>
                Description
              </label>


              <textarea
                required

                value={
                  complaintForm
                    .description
                }

                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,

                    description:
                      e.target.value,
                  })
                }
              />


              <button type="submit">
                Submit Complaint
              </button>

            </form>


            <h2>
              My Complaint History
            </h2>


            {complaints.map(
              (complaint) => (

                <div
                  className="complaint-card"

                  key={
                    complaint.complaint_id
                  }
                >

                  <h3>
                    Complaint #
                    {
                      complaint.complaint_id
                    }
                  </h3>


                  <p>
                    Against:
                    {" "}
                    {
                      complaint
                        .against_doctor_name
                      ||
                      complaint
                        .against_staff_email
                    }
                  </p>


                  <p>
                    Type:
                    {" "}
                    {
                      complaint
                        .complaint_type
                    }
                  </p>


                  <p>
                    {
                      complaint.description
                    }
                  </p>


                  <p>
                    Status:
                    {" "}
                    <strong>
                      {
                        complaint
                          .complaint_status
                      }
                    </strong>
                  </p>


                  {complaint.admin_action && (

                    <p>
                      Admin Action:
                      {" "}
                      {
                        complaint
                          .admin_action
                      }
                    </p>

                  )}

                </div>

              )
            )}

          </section>
        )}


        {/* PROFILE */}

        {section === "profile" && (

          <section>

            <h1>
              My Profile
            </h1>


            <form
              className="profile-form"

              onSubmit={updateProfile}
            >

              <label>
                Full Name
              </label>

              <input
                value={
                  profileForm.full_name
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    full_name:
                      e.target.value,
                  })
                }
              />


              <label>
                Email
              </label>

              <input
                value={
                  patient.email || ""
                }
                disabled
              />


              <label>
                Phone Number
              </label>

              <input
                value={
                  profileForm
                    .phone_number
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    phone_number:
                      e.target.value,
                  })
                }
              />


              <label>
                Gender
              </label>

              <select
                value={
                  profileForm.gender
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    gender:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>

              </select>


              <label>
                Date of Birth
              </label>

              <input
                type="date"

                value={
                  profileForm
                    .date_of_birth
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    date_of_birth:
                      e.target.value,
                  })
                }
              />


              <label>
                Blood Group
              </label>

              <input
                value={
                  profileForm
                    .blood_group
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    blood_group:
                      e.target.value,
                  })
                }
              />


              <label>
                Address
              </label>

              <textarea
                value={
                  profileForm.address
                }

                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,

                    address:
                      e.target.value,
                  })
                }
              />


              <button type="submit">
                Update Profile
              </button>

            </form>

          </section>
        )}

      </main>

    </div>
  );
}


export default PatientDashboard;
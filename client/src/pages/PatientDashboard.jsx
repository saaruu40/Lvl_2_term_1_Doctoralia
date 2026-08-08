import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/PatientDashboard.css";

const API =
  "http://localhost:5000/api/patients";


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

  const [selectedDepartment,
    setSelectedDepartment] =
    useState("");

  const [doctorSearch,
    setDoctorSearch] =
    useState("");

  const [selectedDoctor,
    setSelectedDoctor] =
    useState(null);

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

  }, [patient?.patient_id]);


  // ======================================
  // PROFILE
  // ======================================

  const loadProfile = async () => {

    try {

      const response =
        await fetch(
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
        await fetch(url);

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
        await fetch(
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
        await fetch(`${API}/staff`);

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
        await fetch(
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
          await fetch(
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

        if (response.status === 403) {

          navigate("/suspended");

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
          await fetch(
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


  // ======================================
  // PAYMENT
  // ======================================

  const makePayment =
    async (appointmentId) => {

      const method =
        window.prompt(
          "Payment method: card / cash / mobile_banking"
        );

      if (!method) {
        return;
      }

      try {

        const response =
          await fetch(
            `${API}/payments`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                patient_id:
                  patient.patient_id,

                appointment_id:
                  appointmentId,

                payment_method:
                  method,
              }),
            }
          );

        const data =
          await response.json();

        if (response.ok) {

          setMessage(
            `${data.message} Fee: ${data.fee_type}, Amount: ৳${data.amount}`
          );

          loadAppointments();

        } else {

          setMessage(data.message);
        }

      } catch (error) {

        setMessage(
          "Payment failed."
        );
      }
    };


  // ======================================
  // COMPLAINTS
  // ======================================

  const loadComplaints = async () => {

    try {

      const response =
        await fetch(
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
          await fetch(
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
          await fetch(
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


  // ======================================
  // LOGOUT
  // ======================================

  const logout = () => {

    localStorage.removeItem(
      "patient"
    );

    navigate("/patient-login");
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


                    <button
                      onClick={() =>
                        bookAppointment(
                          doctor.doctor_id
                        )
                      }
                    >
                      Book Appointment
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


                  <button
                    onClick={() =>
                      bookAppointment(
                        selectedDoctor
                          .doctor_id
                      )
                    }
                  >
                    Book Appointment
                  </button>

                </div>

              </div>
            )}

          </section>
        )}


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

                            ? `${appointment.start_time} - ${appointment.end_time}`

                            : "Waiting for staff assignment"
                        }
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
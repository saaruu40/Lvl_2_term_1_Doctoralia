import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/DoctorDashboard.css";

const API = "http://localhost:5000/api/doctors";


// =====================================================
// AUTH FETCH
// =====================================================

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


function DoctorDashboard() {
  const navigate = useNavigate();


  // =====================================================
  // BASIC STATE
  // =====================================================

  const [section, setSection] =
    useState("dashboard");

  const [doctor, setDoctor] =
    useState(null);

  const [message, setMessage] =
    useState("");


  // =====================================================
  // DASHBOARD
  // =====================================================

  const [stats, setStats] = useState({
    confirmedAppointments: 0,
    completedAppointments: 0,
    totalPrescriptions: 0,
    receivedReferrals: 0,
  });


  // =====================================================
  // APPOINTMENTS
  // =====================================================

  const [appointments, setAppointments] =
    useState([]);


  // =====================================================
  // MEDICINE + TEST
  // =====================================================

  const [medicines, setMedicines] =
    useState([]);

  const [tests, setTests] =
    useState([]);


  // =====================================================
  // PRESCRIPTION
  // =====================================================

  const [
    selectedAppointment,
    setSelectedAppointment,
  ] = useState(null);


  const [
    prescriptionForm,
    setPrescriptionForm,
  ] = useState({
    diagnosis: "",
    advice: "",
  });


  const [
    selectedMedicines,
    setSelectedMedicines,
  ] = useState([]);


  const [
    selectedTests,
    setSelectedTests,
  ] = useState([]);


  // =====================================================
  // REFERRAL
  // =====================================================

  const [
    referralDoctors,
    setReferralDoctors,
  ] = useState([]);


  const [
    referralAppointment,
    setReferralAppointment,
  ] = useState(null);


  const [
    referralForm,
    setReferralForm,
  ] = useState({
    referred_to: "",
    reason: "",
  });


  const [sentReferrals, setSentReferrals] =
    useState([]);

  const [
    receivedReferrals,
    setReceivedReferrals,
  ] = useState([]);


  // =====================================================
  // COMPLAINT
  // =====================================================

  const [
    complaintTargets,
    setComplaintTargets,
  ] = useState({
    patients: [],
    staff: [],
  });


  const [complaints, setComplaints] =
    useState([]);


  const [
    complaintForm,
    setComplaintForm,
  ] = useState({
    against_type: "patient",
    against_id: "",
    appointment_id: "",
    complaint_type: "",
    description: "",
  });


  // =====================================================
  // CHECK LOGIN
  // =====================================================

  useEffect(() => {
    const storedDoctor =
      localStorage.getItem("doctor");

    const token =
      localStorage.getItem("token");


    if (!storedDoctor || !token) {
      navigate(
        "/doctor-login",
        {
          replace: true,
        }
      );

      return;
    }


    try {
      setDoctor(
        JSON.parse(storedDoctor)
      );
    } catch {
      logout();
    }

  }, []);


  // =====================================================
  // HANDLE SUSPENSION / UNAUTHORIZED
  // =====================================================

  const handleProtectedResponse =
    async (response) => {

      const data =
        await response.json();


      if (
        response.status === 401 ||
        response.status === 403
      ) {

        localStorage.removeItem(
          "doctor"
        );

        localStorage.removeItem(
          "token"
        );


        alert(
          data.message ||
          "Your session is no longer available."
        );


        navigate(
          "/doctor-login",
          {
            replace: true,
          }
        );


        return {
          stopped: true,
          data,
        };
      }


      return {
        stopped: false,
        data,
      };
    };


  // =====================================================
  // LOAD EVERYTHING
  // =====================================================

  useEffect(() => {
    if (!doctor?.doctor_id) {
      return;
    }

    loadProfile();
    loadStats();
    loadAppointments();
    loadMedicines();
    loadTests();
    loadReferralDoctors();
    loadSentReferrals();
    loadReceivedReferrals();
    loadComplaintTargets();
    loadComplaints();

  }, [doctor?.doctor_id]);


  // =====================================================
  // PROFILE
  // =====================================================

  const loadProfile = async () => {
    try {

      const response =
        await authFetch(
          `${API}/profile`
        );


      const {
        stopped,
        data,
      } =
        await handleProtectedResponse(
          response
        );


      if (stopped) return;


      if (response.ok) {

        setDoctor(
          data.doctor
        );


        localStorage.setItem(
          "doctor",
          JSON.stringify(
            data.doctor
          )
        );
      }

    } catch (error) {

      console.error(
        "Profile error:",
        error
      );
    }
  };


  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  const loadStats = async () => {
    try {

      const response =
        await authFetch(
          `${API}/dashboard/stats`
        );


      const {
        stopped,
        data,
      } =
        await handleProtectedResponse(
          response
        );


      if (stopped) return;


      if (response.ok) {
        setStats(data);
      }

    } catch (error) {

      console.error(
        "Stats error:",
        error
      );
    }
  };


  // =====================================================
  // APPOINTMENTS
  // =====================================================

  const loadAppointments = async () => {
    try {

      const response =
        await authFetch(
          `${API}/appointments`
        );


      const {
        stopped,
        data,
      } =
        await handleProtectedResponse(
          response
        );


      if (stopped) return;


      if (response.ok) {

        setAppointments(
          data.appointments || []
        );
      }

    } catch (error) {

      console.error(
        "Appointments error:",
        error
      );
    }
  };


  // =====================================================
  // MEDICINES
  // =====================================================

  const loadMedicines = async () => {
    try {

      const response =
        await authFetch(
          `${API}/medicines`
        );


      const {
        stopped,
        data,
      } =
        await handleProtectedResponse(
          response
        );


      if (stopped) return;


      if (response.ok) {

        setMedicines(
          data.medicines || []
        );
      }

    } catch (error) {

      console.error(error);
    }
  };


  // =====================================================
  // TESTS
  // =====================================================

  const loadTests = async () => {
    try {

      const response =
        await authFetch(
          `${API}/tests`
        );


      const {
        stopped,
        data,
      } =
        await handleProtectedResponse(
          response
        );


      if (stopped) return;


      if (response.ok) {

        setTests(
          data.tests || []
        );
      }

    } catch (error) {

      console.error(error);
    }
  };


  // =====================================================
  // OPEN PRESCRIPTION
  // =====================================================

  const openPrescription = (
    appointment
  ) => {

    setSelectedAppointment(
      appointment
    );


    setPrescriptionForm({
      diagnosis: "",
      advice: "",
    });


    setSelectedMedicines([]);

    setSelectedTests([]);
  };


  // =====================================================
  // ADD MEDICINE
  // =====================================================

  const addMedicineRow = () => {

    setSelectedMedicines(
      (old) => [
        ...old,

        {
          medicine_id: "",
          dosage: "",
          frequency: "",
          duration: "",
          instruction: "",
        },
      ]
    );
  };


  const updateMedicineRow = (
    index,
    field,
    value
  ) => {

    setSelectedMedicines(
      (old) => {

        const updated = [
          ...old,
        ];

        updated[index] = {
          ...updated[index],
          [field]: value,
        };

        return updated;
      }
    );
  };


  const removeMedicineRow = (
    index
  ) => {

    setSelectedMedicines(
      (old) =>
        old.filter(
          (_, i) =>
            i !== index
        )
    );
  };


  // =====================================================
  // ADD TEST
  // =====================================================

  const addTestRow = () => {

    setSelectedTests(
      (old) => [
        ...old,
        {
          test_id: "",
        },
      ]
    );
  };


  const updateTestRow = (
    index,
    value
  ) => {

    setSelectedTests(
      (old) => {

        const updated = [
          ...old,
        ];

        updated[index] = {
          test_id: value,
        };

        return updated;
      }
    );
  };


  const removeTestRow = (
    index
  ) => {

    setSelectedTests(
      (old) =>
        old.filter(
          (_, i) =>
            i !== index
        )
    );
  };


  // =====================================================
  // SUBMIT PRESCRIPTION
  // =====================================================

  const submitPrescription =
    async (event) => {

      event.preventDefault();


      if (!selectedAppointment) {
        return;
      }


      try {

        const response =
          await authFetch(
            `${API}/prescriptions`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                appointment_id:
                  selectedAppointment
                    .appointment_id,

                diagnosis:
                  prescriptionForm
                    .diagnosis,

                advice:
                  prescriptionForm
                    .advice,

                medicines:
                  selectedMedicines.filter(
                    (item) =>
                      item.medicine_id
                  ),

                tests:
                  selectedTests.filter(
                    (item) =>
                      item.test_id
                  ),
              }),
            }
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        setMessage(
          data.message
        );


        if (response.ok) {

          setSelectedAppointment(
            null
          );

          setPrescriptionForm({
            diagnosis: "",
            advice: "",
          });

          setSelectedMedicines(
            []
          );

          setSelectedTests([]);


          await loadAppointments();

          await loadStats();
        }

      } catch (error) {

        setMessage(
          "Could not create prescription."
        );
      }
    };


  // =====================================================
  // REFERRAL DOCTORS
  // =====================================================

  const loadReferralDoctors =
    async () => {

      try {

        const response =
          await authFetch(
            `${API}/referral-doctors`
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        if (response.ok) {

          setReferralDoctors(
            data.doctors || []
          );
        }

      } catch (error) {

        console.error(error);
      }
    };


  // =====================================================
  // OPEN REFERRAL
  // =====================================================

  const openReferral = (
    appointment
  ) => {

    setReferralAppointment(
      appointment
    );


    setReferralForm({
      referred_to: "",
      reason: "",
    });
  };


  // =====================================================
  // CREATE REFERRAL
  // =====================================================

  const submitReferral =
    async (event) => {

      event.preventDefault();


      if (!referralAppointment) {
        return;
      }


      try {

        const response =
          await authFetch(
            `${API}/referrals`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                appointment_id:
                  referralAppointment
                    .appointment_id,

                referred_to:
                  referralForm
                    .referred_to,

                reason:
                  referralForm
                    .reason,
              }),
            }
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        setMessage(
          data.message
        );


        if (response.ok) {

          setReferralAppointment(
            null
          );


          setReferralForm({
            referred_to: "",
            reason: "",
          });


          await loadAppointments();

          await loadSentReferrals();

          await loadReceivedReferrals();

          await loadStats();
        }

      } catch (error) {

        setMessage(
          "Could not create referral."
        );
      }
    };


  // =====================================================
  // SENT REFERRALS
  // =====================================================

  const loadSentReferrals =
    async () => {

      try {

        const response =
          await authFetch(
            `${API}/referrals/sent`
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        if (response.ok) {

          setSentReferrals(
            data.referrals || []
          );
        }

      } catch (error) {

        console.error(error);
      }
    };


  // =====================================================
  // RECEIVED REFERRALS
  // =====================================================

  const loadReceivedReferrals =
    async () => {

      try {

        const response =
          await authFetch(
            `${API}/referrals/received`
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        if (response.ok) {

          setReceivedReferrals(
            data.referrals || []
          );
        }

      } catch (error) {

        console.error(error);
      }
    };


  // =====================================================
  // COMPLAINT TARGETS
  // =====================================================

  const loadComplaintTargets =
    async () => {

      try {

        const response =
          await authFetch(
            `${API}/complaint-targets`
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        if (response.ok) {

          setComplaintTargets({
            patients:
              data.patients || [],

            staff:
              data.staff || [],
          });
        }

      } catch (error) {

        console.error(error);
      }
    };


  // =====================================================
  // COMPLAINT HISTORY
  // =====================================================

  const loadComplaints =
    async () => {

      try {

        const response =
          await authFetch(
            `${API}/complaints`
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        if (response.ok) {

          setComplaints(
            data.complaints || []
          );
        }

      } catch (error) {

        console.error(error);
      }
    };


  // =====================================================
  // SUBMIT COMPLAINT
  // =====================================================

  const submitComplaint =
    async (event) => {

      event.preventDefault();


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
                ...complaintForm,

                appointment_id:
                  complaintForm
                    .appointment_id ||
                  null,
              }),
            }
          );


        const {
          stopped,
          data,
        } =
          await handleProtectedResponse(
            response
          );


        if (stopped) return;


        setMessage(
          data.message
        );


        if (response.ok) {

          setComplaintForm({
            against_type:
              "patient",

            against_id: "",

            appointment_id: "",

            complaint_type: "",

            description: "",
          });


          await loadComplaints();
        }

      } catch (error) {

        setMessage(
          "Could not submit complaint."
        );
      }
    };


  // =====================================================
  // LOGOUT
  // =====================================================

  const logout = () => {

    localStorage.removeItem(
      "doctor"
    );

    localStorage.removeItem(
      "token"
    );


    navigate(
      "/doctor-login",
      {
        replace: true,
      }
    );
  };


  // =====================================================
  // LOADING
  // =====================================================

  if (!doctor) {
    return (
      <div>
        Loading...
      </div>
    );
  }


  // =====================================================
  // UI
  // =====================================================

  return (

    <div className="doctor-dashboard">


      {/* =============================
          SIDEBAR
      ============================== */}

      <aside className="doctor-sidebar">

        <h2>
          Doctoralia
        </h2>

        <p className="doctor-panel-title">
          Doctor Panel
        </p>


        <button
          onClick={() =>
            setSection(
              "dashboard"
            )
          }
        >
          Dashboard
        </button>


        <button
          onClick={() =>
            setSection(
              "appointments"
            )
          }
        >
          My Appointments
        </button>


        <button
          onClick={() =>
            setSection(
              "referrals"
            )
          }
        >
          Referrals
        </button>


        <button
          onClick={() =>
            setSection(
              "complaints"
            )
          }
        >
          Complaints
        </button>


        <button
          onClick={() =>
            setSection(
              "profile"
            )
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


      {/* =============================
          MAIN
      ============================== */}

      <main className="doctor-main">


        {message && (

          <div className="doctor-message">

            {message}

          </div>
        )}


        {/* =============================
            DASHBOARD
        ============================== */}

        {section === "dashboard" && (

          <section>

            <h1>
              Welcome, Dr.{" "}
              {doctor.full_name}
            </h1>


            <p>
              Manage appointments,
              prescriptions,
              referrals and complaints.
            </p>


            <div className="doctor-stats">


              <div className="stat-card">

                <h3>
                  {
                    stats
                      .confirmedAppointments
                  }
                </h3>

                <p>
                  Confirmed Appointments
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  {
                    stats
                      .completedAppointments
                  }
                </h3>

                <p>
                  Completed
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  {
                    stats
                      .totalPrescriptions
                  }
                </h3>

                <p>
                  Prescriptions
                </p>

              </div>


              <div className="stat-card">

                <h3>
                  {
                    stats
                      .receivedReferrals
                  }
                </h3>

                <p>
                  Referrals Received
                </p>

              </div>

            </div>

          </section>
        )}


        {/* =============================
            APPOINTMENTS
        ============================== */}

        {section ===
          "appointments" && (

          <section>

            <h1>
              My Appointments
            </h1>


            {appointments.length ===
            0 ? (

              <p>
                No appointments found.
              </p>

            ) : (

              <div className="doctor-appointment-list">

                {appointments.map(
                  (appointment) => (

                    <div
                      className="doctor-appointment-card"
                      key={
                        appointment
                          .appointment_id
                      }
                    >

                      <h3>
                        {
                          appointment
                            .patient_name
                        }
                      </h3>


                      <p>
                        <strong>
                          Patient ID:
                        </strong>{" "}
                        #
                        {
                          appointment
                            .patient_id
                        }
                      </p>


                      <p>
                        <strong>
                          Appointment ID:
                        </strong>{" "}
                        #
                        {
                          appointment
                            .appointment_id
                        }
                      </p>


                      <p>
                        <strong>
                          Phone:
                        </strong>{" "}
                        {
                          appointment
                            .patient_phone
                        }
                      </p>


                      <p>
                        <strong>
                          Blood Group:
                        </strong>{" "}
                        {
                          appointment
                            .blood_group ||
                          "-"
                        }
                      </p>


                      <p>
                        <strong>
                          Hospital:
                        </strong>{" "}

                        {
                          appointment
                            .hospital_name ||
                          "Not assigned"
                        }
                      </p>


                      <p>
                        <strong>
                          Date:
                        </strong>{" "}

                        {
                          appointment
                            .available_date

                            ? new Date(
                                appointment
                                  .available_date
                              )
                                .toLocaleDateString()

                            : "Not scheduled"
                        }
                      </p>


                      <p>
                        <strong>
                          Time:
                        </strong>{" "}

                        {
                          appointment
                            .start_time &&
                          appointment
                            .end_time

                            ? `${appointment.start_time} - ${appointment.end_time}`

                            : "Not scheduled"
                        }
                      </p>


                      <p>
                        <strong>
                          Status:
                        </strong>{" "}

                        {
                          appointment
                            .appointment_status
                        }
                      </p>


                      <p>
                        <strong>
                          Payment:
                        </strong>{" "}

                        {
                          appointment
                            .payment_status ||
                          "Not paid"
                        }
                      </p>


                      {/* WRITE PRESCRIPTION */}

                      {
                        appointment
                          .appointment_status ===
                          "confirmed" &&
                        !appointment
                          .prescription_id && (

                          <button
                            onClick={() =>
                              openPrescription(
                                appointment
                              )
                            }
                          >
                            Write Prescription
                          </button>
                        )
                      }


                      {/* REFER */}

                      {
                        (
                          appointment
                            .appointment_status ===
                            "confirmed" ||

                          appointment
                            .appointment_status ===
                            "completed"
                        ) &&

                        !appointment
                          .referral_id && (

                          <button
                            onClick={() =>
                              openReferral(
                                appointment
                              )
                            }
                          >
                            Refer Patient
                          </button>
                        )
                      }


                      {appointment
                        .prescription_id && (

                        <p className="done-text">
                          Prescription Created
                        </p>
                      )}


                      {appointment
                        .referral_id && (

                        <p className="done-text">
                          Patient Referred
                        </p>
                      )}

                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}


        {/* =============================
            REFERRALS
        ============================== */}

        {section === "referrals" && (

          <section>

            <h1>
              Referrals
            </h1>


            <h2>
              Referrals I Sent
            </h2>


            <div className="referral-list">

              {sentReferrals.length ===
              0 ? (

                <p>
                  No sent referrals.
                </p>

              ) : (

                sentReferrals.map(
                  (referral) => (

                    <div
                      className="referral-card"
                      key={
                        referral
                          .referral_id
                      }
                    >

                      <h3>
                        Patient:{" "}
                        {
                          referral
                            .patient_name
                        }
                      </h3>

                      <p>
                        Patient ID: #
                        {
                          referral
                            .patient_id
                        }
                      </p>

                      <p>
                        Appointment ID: #
                        {
                          referral
                            .appointment_id
                        }
                      </p>

                      <p>
                        Referred To: Dr.{" "}
                        {
                          referral
                            .referred_to_name
                        }
                      </p>

                      <p>
                        Department:{" "}
                        {
                          referral
                            .referred_to_department ||
                          "-"
                        }
                      </p>

                      <p>
                        Reason:{" "}
                        {
                          referral.reason
                        }
                      </p>

                      <p>
                        Status:{" "}
                        {
                          referral
                            .referral_status
                        }
                      </p>

                    </div>
                  )
                )
              )}

            </div>


            <h2>
              Referrals Received
            </h2>


            <div className="referral-list">

              {receivedReferrals.length ===
              0 ? (

                <p>
                  No received referrals.
                </p>

              ) : (

                receivedReferrals.map(
                  (referral) => (

                    <div
                      className="referral-card"
                      key={
                        referral
                          .referral_id
                      }
                    >

                      <h3>
                        Patient:{" "}
                        {
                          referral
                            .patient_name
                        }
                      </h3>

                      <p>
                        Patient ID: #
                        {
                          referral
                            .patient_id
                        }
                      </p>

                      <p>
                        Appointment ID: #
                        {
                          referral
                            .appointment_id
                        }
                      </p>

                      <p>
                        Referred By: Dr.{" "}
                        {
                          referral
                            .referred_by_name
                        }
                      </p>

                      <p>
                        Reason:{" "}
                        {
                          referral.reason
                        }
                      </p>

                      <p>
                        Status:{" "}
                        {
                          referral
                            .referral_status
                        }
                      </p>

                    </div>
                  )
                )
              )}

            </div>

          </section>
        )}


        {/* =============================
            COMPLAINT
        ============================== */}

        {section === "complaints" && (

          <section>

            <h1>
              Complaints
            </h1>


            <form
              className="doctor-complaint-form"
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

                <option value="patient">
                  Patient
                </option>

                <option value="staff">
                  Staff
                </option>

              </select>


              <label>
                Select Person
              </label>


              <select
                required

                value={
                  complaintForm
                    .against_id
                }

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


                {
                  complaintForm
                    .against_type ===
                  "patient"

                    ? complaintTargets
                        .patients
                        .map(
                          (patient) => (

                            <option
                              key={
                                patient
                                  .patient_id
                              }

                              value={
                                patient
                                  .patient_id
                              }
                            >
                              {
                                patient
                                  .full_name
                              }
                              {" - #"}
                              {
                                patient
                                  .patient_id
                              }
                            </option>
                          )
                        )

                    : complaintTargets
                        .staff
                        .map(
                          (staff) => (

                            <option
                              key={
                                staff
                                  .staff_id
                              }

                              value={
                                staff
                                  .staff_id
                              }
                            >
                              Staff #
                              {
                                staff
                                  .staff_id
                              }
                              {" - "}
                              {
                                staff.email
                              }
                            </option>
                          )
                        )
                }

              </select>


              <label>
                Related Appointment
                (Optional)
              </label>


              <select
                value={
                  complaintForm
                    .appointment_id
                }

                onChange={(e) =>
                  setComplaintForm({
                    ...complaintForm,

                    appointment_id:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  No Appointment
                </option>


                {appointments.map(
                  (appointment) => (

                    <option
                      key={
                        appointment
                          .appointment_id
                      }

                      value={
                        appointment
                          .appointment_id
                      }
                    >
                      Appointment #
                      {
                        appointment
                          .appointment_id
                      }
                      {" - "}
                      {
                        appointment
                          .patient_name
                      }
                    </option>
                  )
                )}

              </select>


              <label>
                Complaint Type
              </label>


              <input
                required

                type="text"

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
                  className="doctor-complaint-card"

                  key={
                    complaint
                      .complaint_id
                  }
                >

                  <h3>
                    Complaint #
                    {
                      complaint
                        .complaint_id
                    }
                  </h3>


                  <p>
                    Against:{" "}

                    {
                      complaint
                        .against_patient_name
                      ||
                      complaint
                        .against_staff_email
                      ||
                      "-"
                    }
                  </p>


                  <p>
                    Type:{" "}
                    {
                      complaint
                        .complaint_type
                    }
                  </p>


                  <p>
                    {
                      complaint
                        .description
                    }
                  </p>


                  <p>
                    Status:{" "}

                    <strong>
                      {
                        complaint
                          .complaint_status
                      }
                    </strong>
                  </p>


                  {complaint
                    .admin_action && (

                    <p>
                      Admin Action:{" "}
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


        {/* =============================
            PROFILE
        ============================== */}

        {section === "profile" && (

          <section>

            <h1>
              My Profile
            </h1>


            <div className="doctor-profile-card">


              {doctor.profile_photo && (

                <img
                  className="doctor-profile-photo"

                  src={
                    `http://localhost:5000${doctor.profile_photo}`
                  }

                  alt={
                    doctor.full_name
                  }
                />
              )}


              <h2>
                Dr.{" "}
                {doctor.full_name}
              </h2>


              <p>
                <strong>
                  Doctor ID:
                </strong>{" "}
                {
                  doctor.doctor_id
                }
              </p>


              <p>
                <strong>
                  Email:
                </strong>{" "}
                {
                  doctor.email
                }
              </p>


              <p>
                <strong>
                  Phone:
                </strong>{" "}
                {
                  doctor.phone_number
                }
              </p>


              <p>
                <strong>
                  Department:
                </strong>{" "}
                {
                  doctor
                    .department_name
                }
              </p>


              <p>
                <strong>
                  Qualification:
                </strong>{" "}
                {
                  doctor
                    .qualification
                }
              </p>


              <p>
                <strong>
                  Specialization:
                </strong>{" "}
                {
                  doctor
                    .specification
                }
              </p>


              <p>
                <strong>
                  Medical Registration:
                </strong>{" "}
                {
                  doctor
                    .medical_registration_no
                }
              </p>


              <p>
                <strong>
                  New Patient Fee:
                </strong>{" "}
                ৳
                {
                  doctor
                    .new_patient_fee
                }
              </p>


              <p>
                <strong>
                  Follow-up Fee:
                </strong>{" "}
                ৳
                {
                  doctor
                    .followup_fee
                }
              </p>


              <p>
                <strong>
                  Maximum Patients:
                </strong>{" "}
                {
                  doctor
                    .max_patient_num
                }
              </p>


              <div className="profile-referral-summary">

                <h3>
                  Referral Summary
                </h3>

                <p>
                  Sent:{" "}
                  {
                    sentReferrals.length
                  }
                </p>

                <p>
                  Received:{" "}
                  {
                    receivedReferrals
                      .length
                  }
                </p>

              </div>

            </div>

          </section>
        )}


      </main>


      {/* =============================
          PRESCRIPTION MODAL
      ============================== */}

      {selectedAppointment && (

        <div className="doctor-modal">

          <div className="doctor-modal-content">

            <button
              className="close-button"
              onClick={() =>
                setSelectedAppointment(
                  null
                )
              }
            >
              ×
            </button>


            <h2>
              Write Prescription
            </h2>


            <p>
              Patient:{" "}
              <strong>
                {
                  selectedAppointment
                    .patient_name
                }
              </strong>
            </p>


            <p>
              Patient ID: #
              {
                selectedAppointment
                  .patient_id
              }
            </p>


            <form
              onSubmit={
                submitPrescription
              }
            >

              <label>
                Diagnosis
              </label>

              <textarea
                required

                value={
                  prescriptionForm
                    .diagnosis
                }

                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,

                    diagnosis:
                      e.target.value,
                  })
                }
              />


              <label>
                Advice
              </label>

              <textarea
                value={
                  prescriptionForm
                    .advice
                }

                onChange={(e) =>
                  setPrescriptionForm({
                    ...prescriptionForm,

                    advice:
                      e.target.value,
                  })
                }
              />


              <h3>
                Medicines
              </h3>


              {selectedMedicines.map(
                (item, index) => (

                  <div
                    className="prescription-row"
                    key={index}
                  >

                    <select
                      required

                      value={
                        item
                          .medicine_id
                      }

                      onChange={(e) =>
                        updateMedicineRow(
                          index,
                          "medicine_id",
                          e.target.value
                        )
                      }
                    >

                      <option value="">
                        Select Medicine
                      </option>

                      {medicines.map(
                        (medicine) => (

                          <option
                            key={
                              medicine
                                .medicine_id
                            }

                            value={
                              medicine
                                .medicine_id
                            }
                          >
                            {
                              medicine
                                .medicine_name
                            }
                            {" "}
                            {
                              medicine
                                .strength
                            }
                          </option>
                        )
                      )}

                    </select>


                    <input
                      placeholder="Dosage"

                      value={
                        item.dosage
                      }

                      onChange={(e) =>
                        updateMedicineRow(
                          index,
                          "dosage",
                          e.target.value
                        )
                      }
                    />


                    <input
                      placeholder="Frequency"

                      value={
                        item.frequency
                      }

                      onChange={(e) =>
                        updateMedicineRow(
                          index,
                          "frequency",
                          e.target.value
                        )
                      }
                    />


                    <input
                      placeholder="Duration"

                      value={
                        item.duration
                      }

                      onChange={(e) =>
                        updateMedicineRow(
                          index,
                          "duration",
                          e.target.value
                        )
                      }
                    />


                    <input
                      placeholder="Instruction"

                      value={
                        item.instruction
                      }

                      onChange={(e) =>
                        updateMedicineRow(
                          index,
                          "instruction",
                          e.target.value
                        )
                      }
                    />


                    <button
                      type="button"
                      onClick={() =>
                        removeMedicineRow(
                          index
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>
                )
              )}


              <button
                type="button"
                onClick={
                  addMedicineRow
                }
              >
                + Add Medicine
              </button>


              <h3>
                Tests
              </h3>


              {selectedTests.map(
                (item, index) => (

                  <div
                    className="prescription-row"
                    key={index}
                  >

                    <select
                      required

                      value={
                        item.test_id
                      }

                      onChange={(e) =>
                        updateTestRow(
                          index,
                          e.target.value
                        )
                      }
                    >

                      <option value="">
                        Select Test
                      </option>


                      {tests.map(
                        (test) => (

                          <option
                            key={
                              test.test_id
                            }

                            value={
                              test.test_id
                            }
                          >
                            {
                              test.test_name
                            }
                          </option>
                        )
                      )}

                    </select>


                    <button
                      type="button"

                      onClick={() =>
                        removeTestRow(
                          index
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>
                )
              )}


              <button
                type="button"
                onClick={
                  addTestRow
                }
              >
                + Add Test
              </button>


              <button
                type="submit"
                className="save-button"
              >
                Save Prescription
              </button>

            </form>

          </div>

        </div>
      )}


      {/* =============================
          REFERRAL MODAL
      ============================== */}

      {referralAppointment && (

        <div className="doctor-modal">

          <div className="doctor-modal-content">

            <button
              className="close-button"

              onClick={() =>
                setReferralAppointment(
                  null
                )
              }
            >
              ×
            </button>


            <h2>
              Refer Patient
            </h2>


            <p>
              Patient:{" "}
              <strong>
                {
                  referralAppointment
                    .patient_name
                }
              </strong>
            </p>


            <p>
              Patient ID: #
              {
                referralAppointment
                  .patient_id
              }
            </p>


            <p>
              Appointment ID: #
              {
                referralAppointment
                  .appointment_id
              }
            </p>


            <form
              onSubmit={
                submitReferral
              }
            >

              <label>
                Refer To
              </label>


              <select
                required

                value={
                  referralForm
                    .referred_to
                }

                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,

                    referred_to:
                      e.target.value,
                  })
                }
              >

                <option value="">
                  Select Doctor
                </option>


                {referralDoctors.map(
                  (item) => (

                    <option
                      key={
                        item.doctor_id
                      }

                      value={
                        item.doctor_id
                      }
                    >
                      Dr.{" "}
                      {
                        item.full_name
                      }
                      {" - "}
                      {
                        item
                          .department_name
                      }
                    </option>
                  )
                )}

              </select>


              <label>
                Reason
              </label>


              <textarea
                required

                value={
                  referralForm
                    .reason
                }

                onChange={(e) =>
                  setReferralForm({
                    ...referralForm,

                    reason:
                      e.target.value,
                  })
                }
              />


              <button
                type="submit"
                className="save-button"
              >
                Confirm Referral
              </button>

            </form>

          </div>

        </div>
      )}


    </div>
  );
}


export default DoctorDashboard;
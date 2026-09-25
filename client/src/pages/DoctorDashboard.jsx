import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import useInactivityLogout from "../hooks/useInactivityLogout";

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
  const [newMedicine,setNewMedicine]=useState("");

const [newTest,setNewTest]=useState("");


  // =====================================================
  // BASIC STATE
  // =====================================================

  const [section, setSection] =
    useState("dashboard");

  const [doctor, setDoctor] =
    useState(null);

  const [message, setMessage] =
    useState("");
  const [messageType, setMessageType] =
    useState("success");
    const [notifications,setNotifications]=useState([]);


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
const addCustomMedicine = async()=>{


if(!newMedicine.trim())
return;


try{


const response =
await authFetch(
`${API}/add-medicine`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

medicine_name:newMedicine

})

});


const data=await response.json();



if(response.ok){

setMedicines([
...medicines,
data.medicine
]);


setNewMedicine("");

}


}catch(error){

console.log(error);

}


};
const addCustomTest = async()=>{


if(!newTest.trim())
return;


try{


const response =
await authFetch(
`${API}/add-test`,
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

test_name:newTest

})

});


const data=
await response.json();



if(response.ok){

setTests([
...tests,
data.test
]);


setNewTest("");

}


}catch(error){

console.log(error);

}


};
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
  // SCHEDULE MANAGEMENT (Doctor-owned, window 20:00-24:00 Asia/Dhaka, dates today→Dec31)
  // =====================================================

  const [schedules, setSchedules] = useState([]);
  const [windowInfo, setWindowInfo] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
    hospital_id: "",
  });
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [editForm, setEditForm] = useState({
    available_date: "",
    start_time: "",
    end_time: "",
    hospital_id: "",
  });
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [showNextDayDropdown, setShowNextDayDropdown] = useState(false);

  // My Staff + Available Staff (Req 3-6,22-27)
  const [myStaff, setMyStaff] = useState({ primary: null, temporary: null });
  const [availableStaff, setAvailableStaff] = useState([]);

  const loadMyStaff = async () => {
    try {
      const res = await authFetch(`${API}/my-staff`);
      const data = await res.json();
      if (res.ok) setMyStaff({ primary: data.primary || null, temporary: data.temporary || null });
    } catch {}
  };
  const loadAvailableStaff = async () => {
    try {
      const res = await authFetch(`${API}/available-staff`);
      const data = await res.json();
      if (res.ok) setAvailableStaff(data.staff || []);
    } catch {}
  };
//   const loadNotifications = async()=>{

// try{

// const res = await axios.get(
// `http://localhost:5000/api/notifications/doctor/${storedDoctor.doctor_id}`
// );


// setNotifications(
// res.data.notifications
// );


// }

// catch(error){

// console.log(
// "Notification error",
// error
// );

// }

// };
const loadNotifications = async()=>{

try{

const storedDoctor = JSON.parse(
 localStorage.getItem("doctor")
);


if(!storedDoctor?.doctor_id)
return;


const token = localStorage.getItem("token");
const res = await axios.get(
`http://localhost:5000/api/notifications/doctor/${storedDoctor.doctor_id}`,
{ headers: { Authorization: `Bearer ${token}` } }
);


setNotifications(
res.data.notifications || []
);


}
catch(error){

console.log(
"Notification error",
error
);

}

};
  const handleAssignStaff = async (staffId) => {
    try {
      const res = await authFetch(`${API}/assign-staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not assign staff.");
      //showMessage(data.message, "success");
      setMessage(data.message);
setMessageType("success");
      await Promise.all([loadMyStaff(), loadAvailableStaff()]);
    } catch (e) { //showMessage(e.message, "error");setMessage(e.message);
setMessageType("error"); }
  };

  // Schedule dropdown: load authenticated doctor's NEXT-DAY schedules, select to fix/edit (window-gated)
  const handleScheduleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedScheduleId(val);
    if (!val) {
      setEditingScheduleId(null);
      setEditForm({ start_time: "", end_time: "", hospital_id: "" });
      return;
    }
    const s = schedules.find((x) => String(x.schedule_id) === String(val));
    if (s) startEditSchedule(s);
  };

  const handleNextDayIconSelect = (schedule) => {
    setShowNextDayDropdown(false);
    startEditSchedule(schedule);
  };

  // 24-hour helpers - enforce HH:MM, no AM/PM
  const pad2 = (n) => String(n).padStart(2, "0");
  const HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
  const MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));
  const parseHHMM = (val) => {
    const s = String(val || "");
    if (!s.includes(":")) return { h: "", m: "" };
    const [h, m] = s.split(":");
    return { h: h || "", m: m || "" };
  };
  const updateScheduleTime = (field, part, value) => {
    setScheduleForm((prev) => {
      const cur = parseHHMM(prev[field]);
      const h = part === "h" ? value : cur.h || "00";
      const m = part === "m" ? value : cur.m || "00";
      // if field was empty, build properly
      const next = `${h}:${m}`;
      return { ...prev, [field]: next };
    });
  };
  const updateEditTime = (field, part, value) => {
    setEditForm((prev) => {
      const cur = parseHHMM(prev[field]);
      const h = part === "h" ? value : cur.h || "00";
      const m = part === "m" ? value : cur.m || "00";
      return { ...prev, [field]: `${h}:${m}` };
    });
  };


  // auto logout on inactivity (15 min) — frontend UX, backend JWT 1d still authoritative
  const handleInactivityLogout = useCallback(() => {
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    localStorage.setItem("inactive_logout", "1");
    navigate("/doctor-login", { replace: true });
    window.location.replace("/doctor-login");
  }, [navigate]);
  useInactivityLogout(handleInactivityLogout, 5 * 60 * 1000);

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
        await response.json().catch(() => ({}));

      // Only logout on real auth failures, not business-rule 403 WINDOW_CLOSED
      if (response.status === 401) {
        localStorage.removeItem("doctor");
        localStorage.removeItem("token");
        alert(data.message || "Your session is no longer available.");
        navigate("/doctor-login", { replace: true });
        return { stopped: true, data };
      }
      if (
        response.status === 403 &&
        data.code !== "WINDOW_CLOSED" &&
        !data.message?.includes("following day can only be managed")
      ) {
        // check if it's truly auth/suspension, not schedule window
        const msg = String(data.message || "").toLowerCase();
        const isAuthRelated =
          msg.includes("suspended") ||
          msg.includes("approved") ||
          msg.includes("not found") ||
          msg.includes("permission") ||
          msg.includes("token") ||
          data.code === "AUTH_MISSING";
        if (isAuthRelated || response.status === 403 && msg.includes("another doctor")) {
          // keep inline message too, but don't auto-logout for window case
          // For auth-related, logout
          if (isAuthRelated) {
            localStorage.removeItem("doctor");
            localStorage.removeItem("token");
            alert(data.message || "Your session is no longer available.");
            navigate("/doctor-login", { replace: true });
            return { stopped: true, data };
          }
        }
        // For window closed / business rule 403, return not stopped so caller shows inline error
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
    loadWindowInfo();
    loadSchedules();
    loadHospitals();
    loadMyStaff();
    loadAvailableStaff();
    loadNotifications();

  }, [doctor?.doctor_id]);

  // =====================================================
  // SCHEDULE MANAGEMENT LOADERS
  // =====================================================

  const loadWindowInfo = async () => {
    try {
      const response = await authFetch(`${API}/schedules/window`);
      const { stopped, data } = await handleProtectedResponse(response);
      if (stopped) return;
      if (response.ok) setWindowInfo(data);
    } catch (error) {
      console.error("Window info error:", error);
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await authFetch(`${API}/schedules`);
      const { stopped, data } = await handleProtectedResponse(response);
      if (stopped) return;
      if (response.ok) {
        setSchedules(data.schedules || []);
        // Sync windowInfo from same response for Asia/Dhaka consistency (backend is authority)
        if (data.targetDate) {
          setWindowInfo((prev) => prev ? { ...prev, targetDate: data.targetDate, currentDate: data.currentDate, isOpen: data.isOpen, currentTime: data.currentTime, timezone: data.timezone || prev.timezone } : prev);
        }
      }
    } catch (error) {
      console.error("Schedules error:", error);
    }
  };

  const loadHospitals = async () => {
    try {
      const res = await authFetch(`${API}/hospitals`);
      const { stopped, data } = await handleProtectedResponse(res);
      if (stopped) return;
      if (res.ok) setHospitals(data.hospitals || []);
    } catch(e){ console.log("hospitals load fail", e); }
  };

  const createSchedule = async (event) => {
    event.preventDefault();
    console.log("[createSchedule] payload", scheduleForm);
    if (!scheduleForm.hospital_id) { setMessage("Please select a hospital."); setMessageType("error"); return; }
    if (!scheduleForm.available_date) { setMessage("Please select a date."); setMessageType("error"); return; }
    try {
      const response = await authFetch(`${API}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available_date: scheduleForm.available_date,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          hospital_id: Number(scheduleForm.hospital_id),
        }),
      });
      const { stopped, data } = await handleProtectedResponse(response);
      console.log("[createSchedule] response", response.status, data);
      if (stopped) return;
      setMessage(data.message || data.error || (response.ok ? "Schedule created successfully." : "Failed to create schedule."));
      setMessageType(response.ok ? "success" : "error");
      if (response.ok) {
        setScheduleForm({ available_date: "", start_time: "", end_time: "", hospital_id: "" });
        await loadSchedules();
        await loadWindowInfo();
      }
    } catch (error) {
      console.log("[createSchedule] catch", error);
      setMessage(error.message || "Could not create schedule.");
      setMessageType("error");
    }
  };

  const startEditSchedule = (schedule) => {
    setEditingScheduleId(schedule.schedule_id);
    setSelectedScheduleId(String(schedule.schedule_id));
    setEditForm({
      available_date: String(schedule.available_date).split("T")[0],
      start_time: String(schedule.start_time).slice(0, 5),
      end_time: String(schedule.end_time).slice(0, 5),
      hospital_id: schedule.hospital_id ? String(schedule.hospital_id) : "",
    });
  };

  const clearScheduleSelection = () => {
    setSelectedScheduleId("");
    setEditingScheduleId(null);
    setEditForm({ available_date: "", start_time: "", end_time: "", hospital_id: "" });
  };

  const submitEditSchedule = async (scheduleId) => {
    console.log("[submitEditSchedule] payload", editForm);
    try {
      const payload = { available_date: editForm.available_date, start_time: editForm.start_time, end_time: editForm.end_time, hospital_id: editForm.hospital_id ? Number(editForm.hospital_id) : undefined };
      const response = await authFetch(`${API}/schedules/${scheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const { stopped, data } = await handleProtectedResponse(response);
      console.log("[submitEditSchedule] response", response.status, data);
      if (stopped) return;
      setMessage(data.message || data.error || (response.ok ? "Schedule updated." : "Update failed"));
      setMessageType(response.ok ? "success" : "error");
      if (response.ok) {
        setEditingScheduleId(null);
        setSelectedScheduleId("");
        await loadSchedules();
      }
    } catch (error) {
      console.log("[submitEditSchedule] catch", error);
      setMessage(error.message || "Could not update schedule.");
      setMessageType("error");
    }
  };

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm("Delete this schedule slot?")) return;
    console.log("[deleteSchedule] id", scheduleId);
    try {
      const response = await authFetch(`${API}/schedules/${scheduleId}`, {
        method: "DELETE",
      });
      const { stopped, data } = await handleProtectedResponse(response);
      console.log("[deleteSchedule] response", response.status, data);
      if (stopped) return;
      setMessage(data.message || data.error || (response.ok ? "Deleted" : "Delete failed"));
      setMessageType(response.ok ? "success" : "error");
      if (response.ok) {
        if (String(scheduleId) === String(selectedScheduleId)) {
          setSelectedScheduleId("");
          setEditingScheduleId(null);
        }
        await loadSchedules();
      }
    } catch (error) {
      console.log("[deleteSchedule] catch", error);
      setMessage(error.message || "Could not delete schedule.");
      setMessageType("error");
    }
  };

  const toggleAvailability = async (schedule) => {
    const newStatus = schedule.slot_status === "available" ? "unavailable" : "available";
    console.log("[toggleAvailability] id", schedule.schedule_id, newStatus);
    try {
      const response = await authFetch(`${API}/schedules/${schedule.schedule_id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_status: newStatus }),
      });
      const { stopped, data } = await handleProtectedResponse(response);
      console.log("[toggleAvailability] response", response.status, data);
      if (stopped) return;
      setMessage(data.message || data.error || (response.ok ? "Updated" : "Failed"));
      setMessageType(response.ok ? "success" : "error");
      if (response.ok) await loadSchedules();
    } catch (error) {
      console.log("[toggleAvailability] catch", error);
      setMessage(error.message || "Could not update availability.");
      setMessageType("error");
    }
  };


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


  const [appointmentScheduleFilter, setAppointmentScheduleFilter] = useState("");

  // =====================================================
  // APPOINTMENTS
  // =====================================================

  const loadAppointments = async (scheduleId = null) => {
    try {
      const url = scheduleId ? `${API}/appointments?schedule_id=${scheduleId}` : `${API}/appointments`;
      const response =
        await authFetch(
          url
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
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("token");
    navigate("/doctor-login", { replace: true });
    window.location.replace("/doctor-login");
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

 <Link
          to="/"
          style={{ display: "block", padding: "10px 16px", color: "inherit", textDecoration: "none" }}
        >
          🏠 Back to Home
        </Link>
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
              "schedules"
            )
          }
        >
          My Schedules
        </button>

        <button
          onClick={() => {
            setSection("my-staff");
            loadMyStaff();
            loadAvailableStaff();
          }}
        >
          My Staff
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
          <div className={`doctor-message ${messageType}`}>
            {messageType === "error" ? "✕ " : "✓ "}
            {message}
          </div>
        )}

        {doctor?.department_status === 'inactive' && (
          <p style={{ background:'#fef2f2', border:'1px solid #fecaca', padding:'10px', borderRadius:'6px', color:'#991b1b' }}>Your department is currently disabled.</p>
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

            <div style={{ background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "12px" }}>
              <label style={{ fontWeight: 600 }}>Select Schedule:</label>{" "}
              <select
                value={appointmentScheduleFilter}
                onChange={async (e) => {
                  const val = e.target.value;
                  setAppointmentScheduleFilter(val);
                  await loadAppointments(val || null);
                }}
                style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", minWidth: "280px", marginLeft: "8px" }}
              >
                <option value="">-- All Schedules --</option>
                {schedules.map((s) => {
                  const dateStr = String(s.available_date).split("T")[0];
                  // Format 10 Sep 2026 | 10:00 AM - 11:00 AM
                  const fmt = (t) => {
                    const [h,m] = String(t).slice(0,5).split(":").map(Number);
                    const ampm = h >= 12 ? "PM" : "AM";
                    const h12 = h % 12 === 0 ? 12 : h % 12;
                    return `${String(h12).padStart(2,"0")}:${String(m).padStart(2,"0")} ${ampm}`;
                  };
                  return (
                    <option key={s.schedule_id} value={s.schedule_id}>
                      {dateStr} | {fmt(s.start_time)} - {fmt(s.end_time)}
                    </option>
                  );
                })}
              </select>
              {appointmentScheduleFilter && <button onClick={async()=>{ setAppointmentScheduleFilter(""); await loadAppointments(null); }} style={{ marginLeft:"8px", padding:"6px 10px", border:"1px solid #d1d5db", borderRadius:"6px", cursor:"pointer" }}>Clear</button>}
            </div>

            {appointments.length ===
            0 ? (
              <p>{appointmentScheduleFilter ? "No appointments for this schedule." : "No appointments found."}</p>
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

                        {/* {
                         appointment
                            .available_date

                            ? new Date(
                                appointment
                                  .available_date
                              )
                                .toLocaleDateString()

                            : "Not scheduled"
                        } */}
                        {
  appointment.available_date
    ? String(appointment.available_date).split("T")[0]
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
            SCHEDULES - Doctor owns own slots
        ============================== */}

        {section === "schedules" && (
          <section>
            <h1>My Schedules</h1>
            <p style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "12px", borderRadius: "8px" }}>
              <strong>Rule (TESTING):</strong> You can set schedule for <strong>today through Dec 31</strong> only between <strong>8:00 PM and 12:00 AM (Asia/Dhaka)</strong>.
              {windowInfo ? (
                <>
                  <br />
                  Current: {windowInfo.currentDate} {windowInfo.currentTime} | Today: <strong>{windowInfo.currentDate}</strong> | Status:{" "}
                  {windowInfo.isOpen ? <span style={{ color: "green", fontWeight: "bold" }}>OPEN - you can manage</span> : <span style={{ color: "red", fontWeight: "bold" }}>CLOSED</span>}
                  <br />
                  <small>{windowInfo.message}</small>
                </>
              ) : (
                " Loading window..."
              )}
            </p>

            {!windowInfo?.isOpen && (
              <p style={{ color: "#b45309", background: "#fef3c7", padding: "10px", borderRadius: "6px" }}>
                Schedule management is currently closed (window is <strong>8:00 PM – 12:00 AM inclusive Asia/Dhaka</strong>). You can view schedules but cannot create/edit/delete. Today&apos;s (<strong>{windowInfo?.currentDate}</strong>) slots are shown as <strong>UNAVAILABLE</strong> until next window opens at 8:00 PM.
              </p>
            )}

            {/* ================= SCHEDULE LIST DROPDOWN — Next-day to year-end, 4 columns only ================= */}
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", marginTop: "15px", boxShadow: "0 4px 14px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
              <label style={{ fontWeight: 700, color: "#0f766e" }}>Schedule List — Date | start | end | hospital <small style={{ fontWeight: 400, color: "#6b7280" }}>(your schedules from today to Dec 31)</small></label>
              <br />
              <select value={selectedScheduleId} onChange={handleScheduleDropdownChange} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", minWidth: "360px", marginTop: "8px" }}>
                <option value="">-- Select Schedule --</option>
                {schedules.map((s) => {
                  const dateStr = String(s.available_date).split("T")[0];
                  const hosp = s.hospital_name || s.hospital_id || "-";
                  return (
                    <option key={s.schedule_id} value={s.schedule_id}>
                      Date: {dateStr} | start: {String(s.start_time).slice(0,5)} | end: {String(s.end_time).slice(0,5)} | hospital: {hosp}
                    </option>
                  );
                })}
              </select>
              {schedules.length === 0 && <small style={{ marginLeft: "10px", color: "#6b7280" }}>No schedules yet — create one when window is open (8:00 PM–12:00 AM).</small>}
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>Dropdown shows only your schedules from today through Dec 31. Pick one to fix/edit below.</p>
            </div>

            {/* Fix/Edit form for the SELECTED schedule — Date | start | end | hospital only */}
            {selectedScheduleId && editingScheduleId && (
              <div style={{ background: "#ecfdf5", padding: "16px", borderRadius: "12px", marginTop: "12px", border: "1px solid #6ee7b7" }}>
                <h3 style={{ marginTop: 0, color: "#065f46" }}>Fix/Edit Selected Schedule <small style={{ color: "#6b7280", fontWeight: 400 }}>(Date | start | end | hospital)</small></h3>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
                  <div>
                    <label>Date *</label><br />
                    <input type="date" value={editForm.available_date} onChange={(e)=>setEditForm(prev=>({...prev, available_date: e.target.value}))} min={windowInfo?.currentDate || windowInfo?.targetDate || ""} max={`${(windowInfo?.currentDate||windowInfo?.targetDate||String(new Date().getFullYear())+"-12-31").split("-")[0]}-12-31`} required style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }} />
                  </div>
                  <div>
                    <label>Start Time * <small style={{ color: "#6b7280" }}>(24h)</small></label><br />
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <select value={parseHHMM(editForm.start_time).h} onChange={(e) => updateEditTime("start_time", "h", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                        <option value="">HH</option>{HOURS.map((h) => (<option key={h} value={h}>{h}</option>))}
                      </select><span>:</span>
                      <select value={parseHHMM(editForm.start_time).m} onChange={(e) => updateEditTime("start_time", "m", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                        <option value="">MM</option>{MINUTES.map((m) => (<option key={m} value={m}>{m}</option>))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>End Time * <small style={{ color: "#6b7280" }}>(24h)</small></label><br />
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <select value={parseHHMM(editForm.end_time).h} onChange={(e) => updateEditTime("end_time", "h", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                        <option value="">HH</option>{HOURS.map((h) => (<option key={h} value={h}>{h}</option>))}
                      </select><span>:</span>
                      <select value={parseHHMM(editForm.end_time).m} onChange={(e) => updateEditTime("end_time", "m", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                        <option value="">MM</option>{MINUTES.map((m) => (<option key={m} value={m}>{m}</option>))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>Hospital *</label><br />
                    <select value={editForm.hospital_id} onChange={(e)=>setEditForm(prev=>({...prev,hospital_id:e.target.value}))} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", minWidth:"180px" }}>
                      <option value="">Select Hospital</option>
                      {hospitals.map(h=>(<option key={h.hospital_id} value={h.hospital_id}>{h.hospital_name} - {h.city}</option>))}
                    </select>
                  </div>
                  <button onClick={() => submitEditSchedule(editingScheduleId)} disabled={!windowInfo?.isOpen} title={!windowInfo?.isOpen ? "Fix/Edit allowed only 8:00 PM - 12:00 AM (Asia/Dhaka)" : undefined} style={{ padding: "11px 18px", background: windowInfo?.isOpen ? "#0f766e" : "#9ca3af", color: "white", border: "none", borderRadius: "7px", cursor: windowInfo?.isOpen ? "pointer" : "not-allowed", fontWeight: "600" }}>
                    {windowInfo?.isOpen ? "Fix/Edit Schedule" : "Window Closed"}
                  </button>
                  <button onClick={clearScheduleSelection} style={{ padding: "11px 14px", background: "#e5e7eb", border: "none", borderRadius: "7px", cursor: "pointer" }}>Clear</button>
                </div>
                <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Fix for any date from today through Dec 31 same year. Window 8:00 PM–12:00 AM applies to this action only.</p>
              </div>
            )}

            <div style={{ background: "white", padding: "20px", borderRadius: "12px", marginTop: "15px", boxShadow: "0 4px 14px rgba(0,0,0,0.07)" }}>
              <h3>Create Slot — any date from today through Dec 31 same year</h3>
              <form onSubmit={createSchedule} style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "end" }}>
                <div style={{ position: "relative" }}>
                  <label>Date * <small style={{ color: "#6b7280" }}>— today to Dec 31</small></label>
                  <br />
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <input type="date" value={scheduleForm.available_date} onChange={(e)=>setScheduleForm(prev=>({...prev, available_date: e.target.value}))} min={windowInfo?.currentDate || windowInfo?.targetDate || ""} max={`${(windowInfo?.currentDate||windowInfo?.targetDate||String(new Date().getFullYear())+"-12-31").split("-")[0]}-12-31`} required style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", minWidth: "160px" }} />
                    <button type="button" aria-label="View schedules" aria-expanded={showNextDayDropdown} onClick={() => setShowNextDayDropdown((v) => !v)} title={showNextDayDropdown ? "Hide schedules" : "Show schedules (Date | start | end | hospital)"} style={{ padding: "10px 11px", border: "1px solid #0f766e", borderRadius: "7px", background: showNextDayDropdown ? "#0f766e" : "#fff", color: showNextDayDropdown ? "#fff" : "#0f766e", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}>
                      📅 ▾
                    </button>
                  </div>
                  {showNextDayDropdown && (
                    <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 20, background: "white", border: "1px solid #e5e7eb", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.14)", minWidth: "380px", maxHeight: "280px", overflowY: "auto", marginTop: "8px" }}>
                      <div style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", fontWeight: 700, color: "#0f766e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>Schedule List — Date | start | end | hospital</span>
                        <button type="button" onClick={() => setShowNextDayDropdown(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#6b7280" }}>✕</button>
                      </div>
                      {schedules.length === 0 ? (
                        <p style={{ padding: "14px", color: "#6b7280", margin: 0 }}>No schedules yet. Create one for any date from today to Dec 31 (window 8:00 PM–12:00 AM).</p>
                      ) : (
                        schedules.map((s) => {
                          const dateStr = String(s.available_date).split("T")[0];
                          const hosp = s.hospital_name || s.hospital_id || "-";
                          const isSelected = String(selectedScheduleId) === String(s.schedule_id);
                          return (
                            <button key={s.schedule_id} type="button" onClick={() => handleNextDayIconSelect(s)} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: "1px solid #f9fafb", background: isSelected ? "#ecfdf5" : "white", cursor: "pointer" }}>
                              Date: {dateStr} | start: {String(s.start_time).slice(0,5)} | end: {String(s.end_time).slice(0,5)} | hospital: {hosp}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label>Start Time * <small style={{ color: "#6b7280" }}>(24h)</small></label>
                  <br />
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <select required value={parseHHMM(scheduleForm.start_time).h} onChange={(e) => updateScheduleTime("start_time", "h", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                      <option value="">HH</option>
                      {HOURS.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                    <span>:</span>
                    <select required value={parseHHMM(scheduleForm.start_time).m} onChange={(e) => updateScheduleTime("start_time", "m", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                      <option value="">MM</option>
                      {MINUTES.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <small style={{ marginLeft: "4px", color: scheduleForm.start_time ? "#065f46" : "#9ca3af", fontWeight: "600" }}>{scheduleForm.start_time || "--:--"}</small>
                  </div>
                </div>
                <div>
                  <label>End Time * <small style={{ color: "#6b7280" }}>(24h)</small></label>
                  <br />
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <select required value={parseHHMM(scheduleForm.end_time).h} onChange={(e) => updateScheduleTime("end_time", "h", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                      <option value="">HH</option>
                      {HOURS.map((h) => (<option key={h} value={h}>{h}</option>))}
                    </select>
                    <span>:</span>
                    <select required value={parseHHMM(scheduleForm.end_time).m} onChange={(e) => updateScheduleTime("end_time", "m", e.target.value)} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px" }}>
                      <option value="">MM</option>
                      {MINUTES.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                    <small style={{ marginLeft: "4px", color: scheduleForm.end_time ? "#065f46" : "#9ca3af", fontWeight: "600" }}>{scheduleForm.end_time || "--:--"}</small>
                  </div>
                </div>
                <div>
                  <label>Hospital *</label>
                  <br />
                  <select required value={scheduleForm.hospital_id} onChange={(e)=>setScheduleForm(prev=>({...prev,hospital_id:e.target.value}))} style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: "6px", minWidth:"180px" }}>
                    <option value="">Select Hospital</option>
                    {hospitals.map(h=>(<option key={h.hospital_id} value={h.hospital_id}>{h.hospital_name} - {h.city}</option>))}
                  </select>
                </div>
                <button type="submit" disabled={!windowInfo?.isOpen} title={!windowInfo?.isOpen ? "Allowed only 8:00 PM - 12:00 AM" : undefined} style={{ padding: "11px 18px", background: windowInfo?.isOpen ? "#0f766e" : "#9ca3af", color: "white", border: "none", borderRadius: "7px", cursor: windowInfo?.isOpen ? "pointer" : "not-allowed", fontWeight: "600" }}>
                  {windowInfo?.isOpen ? "Add Slot" : "Closed"}
                </button>
              </form>
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>End time must be after start time. Overlapping/duplicate slots are rejected. Hospital is required.</p>
            </div>

            {(() => {
              const yearEnd = `${(windowInfo?.currentDate||windowInfo?.targetDate||String(new Date().getFullYear())+"-12-31").split("-")[0]}-12-31`;
              return (
                <>
                  <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "16px" }}>Use the <strong>📅 ▾</strong> icon next to the fixing date or the dropdown above to view your schedule list (Date | start | end | hospital) — same year from today to {yearEnd}. Window 8:00 PM–12:00 AM applies when fixing. Hospital is required.</p>
                  {/* Minimal 4-column preview removed — dropdown above is the schedule list. No other UI shown. */}
                </>
              );
            })()}
          </section>
        )}

        {section === "my-staff" && (
          <section>
            <h1>My Staff</h1>
            <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
              <h3>Primary Staff</h3>
              {myStaff.primary ? (
                <>
                  <p><strong>Staff:</strong> {myStaff.primary.email} (ID #{myStaff.primary.staff_id}, {myStaff.primary.gender})</p>
                  <p><strong>Status:</strong> {myStaff.primary.is_suspended ? <span style={{color:"red", fontWeight:600}}>Suspended until {new Date(myStaff.primary.suspended_until).toLocaleString()}</span> : <span style={{color:"green", fontWeight:600}}>Active</span>}</p>
                </>
              ) : (
                <p style={{ color: "#6b7280" }}>No Primary Staff assigned.</p>
              )}
              <h3 style={{ marginTop: "14px" }}>Temporary Replacement</h3>
              {myStaff.temporary ? (
                <>
                  <p><strong>Staff:</strong> {myStaff.temporary.email} (ID #{myStaff.temporary.staff_id})</p>
                  <p><strong>Status:</strong> <span style={{color:"green", fontWeight:600}}>Active</span></p>
                  {myStaff.temporary.end_date && <p><strong>Valid Until:</strong> {new Date(myStaff.temporary.end_date).toLocaleString()}</p>}
                </>
              ) : (
                <p style={{ color: "#6b7280" }}>{myStaff.primary && myStaff.primary.is_suspended ? "No temporary yet. Choose from available staff below." : "No Temporary Staff."}</p>
              )}
              <button onClick={() => { loadMyStaff(); loadAvailableStaff(); }} style={{ marginTop: "10px", padding: "8px 12px", background: "#e5e7eb", border: "none", borderRadius: "6px", cursor:"pointer" }}>Refresh</button>
            </div>

            <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <h3>Find Available Staff</h3>
              {availableStaff.length === 0 ? (
                <p style={{ color: "#6b7280" }}>No available staff right now.</p>
              ) : (
                availableStaff.map(s => (
                  <div key={s.staff_id} style={{ display: "flex", justifyContent: "space-between", alignItems:"center", padding:"10px", borderBottom:"1px solid #f3f4f6" }}>
                    <span>{s.email} ({s.gender}) - ID #{s.staff_id}</span>
                    <button onClick={() => handleAssignStaff(s.staff_id)} style={{ padding:"7px 12px", background:"#0f766e", color:"white", border:"none", borderRadius:"6px", cursor:"pointer" }}>Assign</button>
                  </div>
                ))
              )}
              <p style={{fontSize:"12px", color:"#6b7280", marginTop:"8px"}}>Only approved, not suspended, not assigned staff are shown. Backend enforces all checks.</p>
            </div>
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

            <div>

<input

placeholder="Write new medicine name"

value={newMedicine}

onChange={(e)=>
setNewMedicine(e.target.value)
}

/>


<button
type="button"
onClick={addCustomMedicine}
>

+ Add New Medicine

</button>


</div>
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
              <div>

<input

placeholder="Write new test name"

value={newTest}

onChange={(e)=>
setNewTest(e.target.value)
}

/>


<button

type="button"

onClick={addCustomTest}

>

+ Add New Test

</button>


</div>


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
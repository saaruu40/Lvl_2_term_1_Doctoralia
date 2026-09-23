import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";
import logo from "../assets/logo.jfif";
import axios from "axios";
const API = "http://localhost:5000/api/admin";

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

function AdminDashboard() {
  const navigate = useNavigate();

  const storedAdmin = JSON.parse(
    localStorage.getItem("admin")
  );

  const [section, setSection] = useState("dashboard");

  const [stats, setStats] = useState({
    pendingDoctors: 0,
    pendingStaff: 0,
    approvedDoctors: 0,
    departments: 0,
  });

  const [pendingDoctors, setPendingDoctors] =
    useState([]);

  const [pendingStaff, setPendingStaff] =
    useState([]);

  const [approvedStaff, setApprovedStaff] = useState([]);
  const [suspendedStaff, setSuspendedStaff] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [notifications,setNotifications]=useState([]);

  const [doctorHistory, setDoctorHistory] =
    useState([]);

  const [staffHistory, setStaffHistory] =
    useState([]);

  const [departments, setDepartments] =
    useState([]);

  // ============================
  // COMPLAINT STATE
  // ============================

  const [complaints, setComplaints] =
    useState([]);

  const [departmentForm, setDepartmentForm] =
    useState({
      department_name: "",
      description: "",
    });

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  const [deptSearch, setDeptSearch] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!storedAdmin) {
      navigate("/login");
      return;
    }

    loadEverything();
  }, []);
  useEffect(() => {
  document.body.style.overflow = "auto";
  document.body.style.pointerEvents = "auto";

  return () => {
    document.body.style.overflow = "auto";
    document.body.style.pointerEvents = "auto";
  };
}, []);

  const loadEverything = async () => {
    await Promise.all([
      loadStats(),
      loadPendingDoctors(),
      loadPendingStaff(),
      loadApprovedStaff(),
      loadSuspendedStaff(),
      loadAvailableStaff(),
      loadDoctorHistory(),
      loadStaffHistory(),
      loadDepartments(),
      loadComplaints(),
      loadNotifications()
    ]);
  };


  // ============================
  // LOAD FUNCTIONS
  // ============================

  const loadStats = async () => {
    try {
      const response = await authFetch(
        `${API}/dashboard/stats`
      );

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error(error);
    }
  };
const loadNotifications = async()=>{

try{

const res = await axios.get(
`http://localhost:5000/api/notifications/admin/${storedAdmin.admin_id}`
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

  const loadPendingDoctors = async () => {
    try {
      const response = await authFetch(
        `${API}/doctors/pending`
      );

      const data = await response.json();

      if (response.ok) {
        setPendingDoctors(data.doctors || []);
      }
    } catch (error) {
      console.error(error);
    }
  };


  const loadPendingStaff = async () => {
    try {
      const response = await authFetch(
        `${API}/staff/pending`
      );

      const data = await response.json();

      if (response.ok) {
        setPendingStaff(data.staff || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadApprovedStaff = async () => {
    try {
      const res = await authFetch(`${API}/staff/approved`);
      const data = await res.json();
      if (res.ok) setApprovedStaff(data.staff || []);
    } catch {}
  };
  const loadSuspendedStaff = async () => {
    try {
      const res = await authFetch(`${API}/staff/suspended`);
      const data = await res.json();
      if (res.ok) setSuspendedStaff(data.staff || []);
    } catch {}
  };
  const loadAvailableStaff = async () => {
    try {
      const res = await authFetch(`${API}/staff/available`);
      const data = await res.json();
      if (res.ok) setAvailableStaff(data.staff || []);
    } catch {}
  };


  const loadDoctorHistory = async () => {
    if (!storedAdmin) return;

    try {
      const response = await authFetch(
        `${API}/history/doctors/${storedAdmin.admin_id}`
      );

      const data = await response.json();

      if (response.ok) {
        setDoctorHistory(data.doctors || []);
      }
    } catch (error) {
      console.error(error);
    }
  };


  const loadStaffHistory = async () => {
    if (!storedAdmin) return;

    try {
      const response = await authFetch(
        `${API}/history/staff/${storedAdmin.admin_id}`
      );

      const data = await response.json();

      if (response.ok) {
        setStaffHistory(data.staff || []);
      }
    } catch (error) {
      console.error(error);
    }
  };


  const loadDepartments = async (search = deptSearch) => {
    try {
      const q = search && String(search).trim() ? `?search=${encodeURIComponent(String(search).trim())}` : "";
      const response = await authFetch(
        `${API}/departments${q}`
      );

      const data = await response.json();

      if (response.ok) {
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Debounced search: fetch from DB on typing
  useEffect(() => {
    const t = setTimeout(() => { if (storedAdmin) loadDepartments(deptSearch); }, 350);
    return () => clearTimeout(t);
  }, [deptSearch]);


  // ============================
  // LOAD COMPLAINTS
  // ============================

  const loadComplaints = async () => {
    try {
      const response = await authFetch(
        `${API}/complaints`
      );

      const data = await response.json();

      if (response.ok) {
        setComplaints(data.complaints || []);
      } else {
        console.error(
          data.message || "Could not load complaints."
        );
      }

    } catch (error) {
      console.error(
        "Load complaints error:",
        error
      );
    }
  };


  // ============================
  // DOCTOR ACTION
  // ============================

  const handleDoctorDecision = async (
    doctorId,
    action
  ) => {
    try {
      const response = await authFetch(
        `${API}/doctors/${doctorId}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          // body: JSON.stringify({
          //   admin_id: storedAdmin.admin_id,
          // }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(data.message);

      await loadPendingDoctors();
      await loadDoctorHistory();
      await loadStats();

    } catch (error) {
      setMessage(error.message);
    }
  };


  // ============================
  // STAFF ACTION
  // ============================

  const handleStaffDecision = async (
    staffId,
    action
  ) => {
    try {
      const response = await authFetch(
        `${API}/staff/${staffId}/${action}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          // body: JSON.stringify({
          //   admin_id: storedAdmin.admin_id,
          // }),
        }
      );
// 
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(data.message);

      await loadPendingStaff();
      await loadApprovedStaff();
      await loadSuspendedStaff();
      await loadAvailableStaff();
      await loadStaffHistory();
      await loadStats();

    } catch (error) {
      setMessage(error.message);
    }
  };


  // ============================
  // COMPLAINT ACTION
  // ============================

  const handleComplaintAction = async (
    complaintId,
    action
  ) => {
    try {
     
      const response = await authFetch(
        `${API}/complaints/${complaintId}/${action}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          // body: JSON.stringify({
          //   admin_id: storedAdmin.admin_id,
          // }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Complaint action failed."
        );
      }

      setMessage(data.message);

      await Promise.all([loadComplaints(), loadApprovedStaff(), loadSuspendedStaff(), loadAvailableStaff(), loadStats()]);

    } catch (error) {
      setMessage(error.message);
    }
  };


  // ============================
  // GET COMPLAINT FILED BY
  // ============================

  const getComplaintFiledBy = (complaint) => {
    if (complaint.filed_by_patient_id) {
      return {
        type: "Patient",
        name:
          complaint.filed_by_patient_name ||
          `Patient #${complaint.filed_by_patient_id}`,
      };
    }

    if (complaint.filed_by_doctor_id) {
      return {
        type: "Doctor",
        name:
          complaint.filed_by_doctor_name ||
          `Doctor #${complaint.filed_by_doctor_id}`,
      };
    }

    if (complaint.filed_by_staff_id) {
      return {
        type: "Staff",
        name:
          complaint.filed_by_staff_email ||
          `Staff #${complaint.filed_by_staff_id}`,
      };
    }

    return {
      type: "Unknown",
      name: "Unknown User",
    };
  };


  // ============================
  // GET COMPLAINT AGAINST
  // ============================

  const getComplaintAgainst = (complaint) => {
    if (complaint.against_patient_id) {
      return {
        type: "Patient",
        name:
          complaint.against_patient_name ||
          `Patient #${complaint.against_patient_id}`,
      };
    }

    if (complaint.against_doctor_id) {
      return {
        type: "Doctor",
        name:
          complaint.against_doctor_name ||
          `Doctor #${complaint.against_doctor_id}`,
      };
    }

    if (complaint.against_staff_id) {
      return {
        type: "Staff",
        name:
          complaint.against_staff_email ||
          `Staff #${complaint.against_staff_id}`,
      };
    }

    return {
      type: "Unknown",
      name: "Unknown User",
    };
  };


  // ============================
  // DEPARTMENT FORM
  // ============================

  const handleDepartmentChange = (event) => {
    const { name, value } = event.target;

    setDepartmentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();

    try {
      const url = editingDepartment
        ? `${API}/departments/${editingDepartment}`
        : `${API}/departments`;

      const response = await authFetch(url, {
        method: editingDepartment ? "PUT" : "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(departmentForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(data.message);

      setDepartmentForm({
        department_name: "",
        description: "",
      });

      setEditingDepartment(null);

      await loadDepartments(deptSearch);
      await loadStats();

    } catch (error) {
      setMessage(error.message);
    }
  };


  const editDepartment = (department) => {
    setEditingDepartment(
      department.department_id
    );

    setDepartmentForm({
      department_name:
        department.department_name,

      description:
        department.description || "",
    });
  };


  const deleteDepartment = async (
    departmentId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this department?"
    );

    if (!confirmed) return;

    try {
      const response = await authFetch(
        `${API}/departments/${departmentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setMessage(data.message);

      await loadDepartments(deptSearch);
      await loadStats();

    } catch (error) {
      setMessage(error.message);
    }
  };

  const disableDepartment = async (departmentId) => {
  try {

    const response = await authFetch(
      `${API}/departments/${departmentId}/disable`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    setMessage(data.message);

    await loadDepartments(deptSearch);
    await loadStats();

  } catch (error) {
    setMessage(error.message);
  }
};



const enableDepartment = async (departmentId) => {
  try {

    const response = await authFetch(
      `${API}/departments/${departmentId}/enable`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    setMessage(data.message);

    await loadDepartments(deptSearch);
    await loadStats();

  } catch (error) {
    setMessage(error.message);
  }
};
  // ============================
  // LOGOUT
  // ============================

  const logout = () => {
    localStorage.removeItem("admin");
     localStorage.removeItem("token");
   // navigate("/login");
     document.body.style.overflow = "auto";
  document.body.style.pointerEvents = "auto";

  window.location.replace("/login");
  };


  if (!storedAdmin) {
    return null;
  }


  return (
    <div
      className="admin-dashboard"
      style={{
        "--dashboard-logo": `url(${logo})`,
      }}
    >

      {/* SIDEBAR */}

      <aside className="admin-sidebar">

        <div className="admin-brand">
          Doctoralia
          <span>Admin Panel</span>
        </div>

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
          Doctor Requests

          {stats.pendingDoctors > 0 && (
            <span className="notification-count">
              {stats.pendingDoctors}
            </span>
          )}
        </button>

        <button
          onClick={() =>
            setSection("staff")
          }
        >
          Staff Requests

          {stats.pendingStaff > 0 && (
            <span className="notification-count">
              {stats.pendingStaff}
            </span>
          )}
        </button>

        <button
          onClick={() =>
            setSection("history")
          }
        >
          Approval History
        </button>

        <button
          onClick={() =>
            setSection("departments")
          }
        >
          Departments
        </button>


        {/* COMPLAINT BUTTON */}

        <button
          onClick={() =>
            setSection("complaints")
          }
        >
          Complaints

          {complaints.filter(
            (complaint) =>
              complaint.complaint_status ===
              "pending"
          ).length > 0 && (

            <span className="notification-count">

              {
                complaints.filter(
                  (complaint) =>
                    complaint.complaint_status ===
                    "pending"
                ).length
              }

            </span>

          )}
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

      <main className="admin-main">

        <div className="admin-topbar">

          <div>
            <h1>Admin Dashboard</h1>

            <p>
              Welcome, {storedAdmin.full_name}
            </p>
          </div>

        </div>


        {message && (
          <div className="dashboard-message">
            {message}
          </div>
        )}


        {/* DASHBOARD HOME */}

        {section === "dashboard" && (
          <>
            <div className="dashboard-stat-grid">

              <div className="stat-card">
                <span>Pending Doctors</span>

                <strong>
                  {stats.pendingDoctors}
                </strong>
              </div>

              <div className="stat-card">
                <span>Pending Staff</span>

                <strong>
                  {stats.pendingStaff}
                </strong>
              </div>

              <div className="stat-card">
                <span>
                  Approved Doctors
                </span>

                <strong>
                  {stats.approvedDoctors}
                </strong>
              </div>

              <div className="stat-card">
                <span>Departments</span>

                <strong>
                  {stats.departments}
                </strong>
              </div>

            </div>

            <section className="dashboard-panel">

              <h2>Quick Overview</h2>

              <p>
                You currently have{" "}

                <strong>
                  {stats.pendingDoctors}
                </strong>{" "}

                doctor applications and{" "}

                <strong>
                  {stats.pendingStaff}
                </strong>{" "}

                staff applications waiting
                for review.
              </p>

            </section>
          </>
        )}


        {/* DOCTOR REQUESTS */}

        {section === "doctors" && (
          <section className="dashboard-panel">

            <h2>
              Pending Doctor Applications
            </h2>

            {pendingDoctors.length === 0 ? (
              <p>
                No pending doctor applications.
              </p>
            ) : (

              <div className="request-grid">

                {pendingDoctors.map(
                  (doctor) => (

                    <div
                      className="request-card"
                      key={doctor.doctor_id}
                    >

                      {doctor.profile_photo && (
                        <img
                          className="request-photo"
                          src={`http://localhost:5000${doctor.profile_photo}`}
                          alt={doctor.full_name}
                        />
                      )}

                      <h3>
                        {doctor.full_name}
                      </h3>

                      <p>
                        <strong>Email:</strong>{" "}
                        {doctor.email}
                      </p>

                      <p>
                        <strong>Phone:</strong>{" "}
                        {doctor.phone_number}
                      </p>

                      <p>
                        <strong>
                          Department:
                        </strong>{" "}
                        {doctor.department_name ||
                          "Not assigned"}
                      </p>

                      <p>
                        <strong>
                          Qualification:
                        </strong>{" "}
                        {doctor.qualification}
                      </p>

                      <p>
                        <strong>
                          Specialization:
                        </strong>{" "}
                        {doctor.specification}
                      </p>

                      <p>
                        <strong>
                          Registration No:
                        </strong>{" "}
                        {
                          doctor.medical_registration_no
                        }
                      </p>

                      <div className="decision-buttons">

                        <button
                          className="approve-button"
                          onClick={() =>
                            handleDoctorDecision(
                              doctor.doctor_id,
                              "approve"
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="reject-button"
                          onClick={() =>
                            handleDoctorDecision(
                              doctor.doctor_id,
                              "reject"
                            )
                          }
                        >
                          Reject
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>
        )}


        {/* STAFF REQUESTS */}

        {section === "staff" && (
          <section className="dashboard-panel">

            <h2>
              Pending Staff Applications
            </h2>

            {pendingStaff.length === 0 ? (
              <p>
                No pending staff applications.
              </p>
            ) : (

              <div className="request-grid">

                {pendingStaff.map(
                  (staff) => (

                    <div
                      className="request-card"
                      key={staff.staff_id}
                    >

                      {staff.profile_pic && (
                        <img
                          className="request-photo"
                          src={`http://localhost:5000${staff.profile_pic}`}
                          alt="Staff"
                        />
                      )}

                      <h3>
                        Staff #{staff.staff_id}
                      </h3>

                      <p>
                        <strong>Email:</strong>{" "}
                        {staff.email}
                      </p>

                      <p>
                        <strong>Phone:</strong>{" "}
                        {staff.phone_number}
                      </p>

                      <p>
                        <strong>Gender:</strong>{" "}
                        {staff.gender}
                      </p>

                      <div className="decision-buttons">

                        <button
                          className="approve-button"
                          onClick={() =>
                            handleStaffDecision(
                              staff.staff_id,
                              "approve"
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="reject-button"
                          onClick={() =>
                            handleStaffDecision(
                              staff.staff_id,
                              "reject"
                            )
                          }
                        >
                          Reject
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

            <div style={{ marginTop:"20px", background:"white", padding:"16px", borderRadius:"10px", border:"1px solid #e5e7eb" }}>
              <h3>Approved Staff {approvedStaff.length ? `(${approvedStaff.length})` : ""}</h3>
              {approvedStaff.length===0 ? <p>No approved staff.</p> : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"12px", marginTop:"10px" }}>
                  {approvedStaff.map(s=> (
                    <div key={s.staff_id} style={{ border:"1px solid #e5e7eb", padding:"10px", borderRadius:"8px" }}>
                      <p><strong>#{s.staff_id} {s.email}</strong></p>
                      <p style={{fontSize:"13px"}}>Phone: {s.phone_number} | {s.gender}</p>
                      <p style={{fontSize:"13px"}}>Assigned: {s.assignment_id ? `Dr. ${s.assigned_doctor_name} (${s.assignment_type})` : "Not assigned"}</p>
                      <p style={{fontSize:"13px"}}>Available: {s.is_available ? <span style={{color:"green"}}>YES</span> : <span style={{color:"red"}}>NO</span>} {s.is_suspended ? "(Suspended)" : ""}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginTop:"16px", background:"white", padding:"16px", borderRadius:"10px", border:"1px solid #e5e7eb" }}>
              <h3>Suspended Staff {suspendedStaff.length ? `(${suspendedStaff.length})` : ""}</h3>
              {suspendedStaff.length===0 ? <p>No suspended staff.</p> : (
                suspendedStaff.map(s=> (
                  <div key={s.staff_id} style={{ padding:"8px", borderBottom:"1px solid #f3f4f6" }}>
                    <strong>#{s.staff_id} {s.email}</strong> - until {new Date(s.suspended_until).toLocaleString()}
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop:"16px", background:"white", padding:"16px", borderRadius:"10px", border:"1px solid #e5e7eb" }}>
              <h3>Available Staff {availableStaff.length ? `(${availableStaff.length})` : ""}</h3>
              {availableStaff.length===0 ? <p>No available staff.</p> : (
                availableStaff.map(s=> (
                  <div key={s.staff_id} style={{ padding:"8px", borderBottom:"1px solid #f3f4f6" }}>
                    #{s.staff_id} {s.email} ({s.gender}) - {s.phone_number}
                  </div>
                ))
              )}
            </div>

          </section>
        )}


        {/* HISTORY */}

        {section === "history" && (
          <>

            <section className="dashboard-panel">

              <h2>
                Doctor Approval History
              </h2>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Reviewed</th>
                    </tr>
                  </thead>

                  <tbody>

                    {doctorHistory.map(
                      (doctor) => (

                        <tr
                          key={doctor.doctor_id}
                        >

                          <td>
                            {doctor.full_name}
                          </td>

                          <td>
                            {doctor.email}
                          </td>

                          <td>
                            {doctor.department_name ||
                              "-"}
                          </td>

                          <td>
                            <span
                              className={`status ${doctor.approval_status}`}
                            >
                              {
                                doctor.approval_status
                              }
                            </span>
                          </td>

                          <td>
                            {doctor.reviewed_at
                              ? new Date(
                                  doctor.reviewed_at
                                ).toLocaleString()
                              : "-"}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>


            <section className="dashboard-panel">

              <h2>
                Staff Approval History
              </h2>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Gender</th>
                      <th>Status</th>
                      <th>Reviewed</th>
                    </tr>
                  </thead>

                  <tbody>

                    {staffHistory.map(
                      (staff) => (

                        <tr
                          key={staff.staff_id}
                        >

                          <td>
                            {staff.email}
                          </td>

                          <td>
                            {staff.phone_number}
                          </td>

                          <td>
                            {staff.gender}
                          </td>

                          <td>
                            <span
                              className={`status ${staff.approval_status}`}
                            >
                              {
                                staff.approval_status
                              }
                            </span>
                          </td>

                          <td>
                            {staff.reviewed_at
                              ? new Date(
                                  staff.reviewed_at
                                ).toLocaleString()
                              : "-"}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </>
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


        {/* DEPARTMENTS */}

        {section === "departments" && (
          <section className="dashboard-panel">

            <h2>
              Department Management
            </h2>

            <form
              className="department-form"
              onSubmit={
                handleDepartmentSubmit
              }
            >

              <input
                type="text"
                name="department_name"
                placeholder="Department name"
                value={
                  departmentForm.department_name
                }
                onChange={
                  handleDepartmentChange
                }
                required
              />

              <input
                type="text"
                name="description"
                placeholder="Description"
                value={
                  departmentForm.description
                }
                onChange={
                  handleDepartmentChange
                }
              />

              <button type="submit">

                {editingDepartment
                  ? "Update Department"
                  : "Add Department"}

              </button>

              {editingDepartment && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {

                    setEditingDepartment(
                      null
                    );

                    setDepartmentForm({
                      department_name: "",
                      description: "",
                    });

                  }}
                >
                  Cancel
                </button>
              )}

            </form>

            <div className="department-search-bar" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Search departments by name..."
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                style={{ flex: 1, padding: "8px 10px", border: "1px solid #d0d7de", borderRadius: 6 }}
              />
              {deptSearch && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeptSearch("")}
                >
                  Clear
                </button>
              )}
            </div>
            {deptSearch && departments.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#666", marginBottom: 12 }}>
                No departments match &quot;{deptSearch}&quot;.
              </p>
            ) : null}


            <div className="department-list">

              {departments.map(
                (department) => (

                  <div
                    className="department-item"
                    key={
                      department.department_id
                    }
                  >

                    <div>

                      <h3>
                        {
                          department.department_name
                        }
                      </h3>

                      <p>
                        {department.description ||
                          "No description"}
                      </p>

                    </div>

                    <div className="department-actions">

                      <button
                        className="edit-button"
                        onClick={() =>
                          editDepartment(
                            department
                          )
                        }
                      >
                        Edit
                      </button>
{/* 
                      <button
                        className="reject-button"
                        onClick={() =>
                          deleteDepartment(
                            department.department_id
                          )
                        }
                      >
                        Delete
                      </button> */}
                      {department.status === "active" ? (

  <button 
    className="reject-button"
    onClick={() => 
      disableDepartment(
        department.department_id
      )
    }
  >
    Disable
  </button>

) : (

  <button 
    className="approve-button"
    onClick={() => 
      enableDepartment(
        department.department_id
      )
    }
  >
    Enable
  </button>

)}

                    </div>

                  </div>

                )
              )}

            </div>

          </section>
        )}


        {/* ============================
            COMPLAINTS
        ============================ */}

        {section === "complaints" && (
          <section className="dashboard-panel">

            <h2>
              Complaint Management
            </h2>

            {complaints.length === 0 ? (

              <p>
                No complaints found.
              </p>

            ) : (

              <div className="complaint-list">

                {complaints.map(
                  (complaint) => {

                    const filedBy =
                      getComplaintFiledBy(
                        complaint
                      );

                    const against =
                      getComplaintAgainst(
                        complaint
                      );

                    return (

                      <div
                        className="complaint-card"
                        key={
                          complaint.complaint_id
                        }
                      >

                        <div className="complaint-top">

                          <h3>
                            Complaint #
                            {
                              complaint.complaint_id
                            }
                          </h3>

                          <span
                            className={`status ${complaint.complaint_status}`}
                          >
                            {
                              complaint.complaint_status
                            }
                          </span>

                        </div>


                        <div className="complaint-user-box">

                          <div>

                            <span className="complaint-label">
                              Filed By
                            </span>

                            <strong>
                              {filedBy.name}
                            </strong>

                            <small>
                              {filedBy.type}
                            </small>

                          </div>


                          <div>

                            <span className="complaint-label">
                              Against
                            </span>

                            <strong>
                              {against.name}
                            </strong>

                            <small>
                              {against.type}
                            </small>

                          </div>

                        </div>


                        <p>
                          <strong>
                            Complaint Type:
                          </strong>{" "}
                          {
                            complaint.complaint_type ||
                            "-"
                          }
                        </p>


                        <p>
                          <strong>
                            Description:
                          </strong>{" "}
                          {
                            complaint.description ||
                            "-"
                          }
                        </p>


                        {complaint.appointment_id && (

                          <p>
                            <strong>
                              Appointment ID:
                            </strong>{" "}
                            {
                              complaint.appointment_id
                            }
                          </p>

                        )}


                        {complaint.complaint_status ===
                          "pending" && (

                          <div className="decision-buttons">

                            <button
                              className="reject-button"
                              onClick={() =>
                                handleComplaintAction(
                                  complaint.complaint_id,
                                  "suspend"
                                )
                              }
                            >
                              Suspend 5 Days
                            </button>


                            <button
                              className="dismiss-button"
                              onClick={() =>
                                handleComplaintAction(
                                  complaint.complaint_id,
                                  "dismiss"
                                )
                              }
                            >
                              Dismiss Complaint
                            </button>

                          </div>

                        )}


                        {complaint.complaint_status !==
                          "pending" && (

                          <div className="complaint-review">

                            <p>
                              <strong>
                                Admin Action:
                              </strong>{" "}
                              {
                                complaint.admin_action ||
                                "-"
                              }
                            </p>

                            <p>
                              <strong>
                                Reviewed By:
                              </strong>{" "}

                              {complaint.reviewed_by_name
                                ? complaint.reviewed_by_name
                                : complaint.reviewed_by
                                  ? `Admin #${complaint.reviewed_by}`
                                  : "-"}

                            </p>

                          </div>

                        )}

                      </div>

                    );

                  }
                )}

              </div>

            )}

          </section>
        )}


        {/* PROFILE */}

        {section === "profile" && (
          <section className="dashboard-panel profile-panel">

            <div className="profile-avatar">

              {storedAdmin.full_name
                ?.charAt(0)
                .toUpperCase()}

            </div>

            <h2>
              {storedAdmin.full_name}
            </h2>

            <div className="profile-details">

              <p>
                <strong>Admin ID</strong>

                <span>
                  {storedAdmin.admin_id}
                </span>
              </p>

              <p>
                <strong>Email</strong>

                <span>
                  {storedAdmin.email}
                </span>
              </p>

              <p>
                <strong>Phone</strong>

                <span>
                  {storedAdmin.phone_number}
                </span>
              </p>

            </div>

          </section>
        )}

      </main>

    </div>
  );
}

export default AdminDashboard;
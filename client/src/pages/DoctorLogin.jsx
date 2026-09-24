import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/DoctorAuth.css";

const DoctorLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [inactiveMsg, setInactiveMsg] = useState("");

  useEffect(() => {
    if (localStorage.getItem("inactive_logout") === "1") {
      setInactiveMsg("You have been logged out due to inactivity.");
      localStorage.removeItem("inactive_logout");
    }
  }, []);

  const token = localStorage.getItem("token");
  const alreadyLoggedIn = !!token && (!!localStorage.getItem("admin") || !!localStorage.getItem("doctor") || !!localStorage.getItem("staff") || !!localStorage.getItem("patient"));

  const handleAlreadyLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    localStorage.removeItem("doctor");
    localStorage.removeItem("staff");
    localStorage.removeItem("patient");
    localStorage.removeItem("inactive_logout");
    window.location.reload();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  // const handleSubmit = async (event) => {
  //   event.preventDefault();
  //   setMessage("");

  //   try {
  //     setLoading(true);

  //     const response = await fetch(
  //       "http://localhost:5000/api/doctors/login",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         credentials: "include",
  //         body: JSON.stringify(formData),
  //       }
  //     );

  //     const result = await response.json();

  //     if (!response.ok) {
  //       throw new Error(result.message || "Doctor login failed.");
  //     }
  //      localStorage.setItem("token", result.token);    
  //     localStorage.setItem("doctor", JSON.stringify(result.doctor));

  //     setMessageType("success");
  //     setMessage("Login successful.");

  //    // navigate("/doctor-dashboard");
  //   } catch (error) {
  //     setMessageType("error");
  //     setMessage(error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
  const handleSubmit = async (event) => {
  event.preventDefault();

  setMessage("");

  try {
    setLoading(true);

    const response = await fetch(
      "http://localhost:5000/api/doctors/login",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(formData),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
        "Doctor login failed."
      );
    }

    // ==============================
    // SAVE JWT TOKEN
    // ==============================

    localStorage.setItem(
      "token",
      result.token
    );


    // ==============================
    // SAVE DOCTOR INFO
    // ==============================

    localStorage.setItem(
      "doctor",
      JSON.stringify(
        result.doctor
      )
    );


    setMessageType("success");

    setMessage(
      "Login successful."
    );


    // ==============================
    // GO TO DOCTOR DASHBOARD
    // ==============================

    navigate(
      "/doctor-dashboard"
    );

  } catch (error) {

    setMessageType("error");

    setMessage(
      error.message
    );

  } finally {

    setLoading(false);
  }
};

  if (alreadyLoggedIn) {
    return (
      <div className="doctor-auth-page">
        <div className="doctor-login-card">
          <Link to="/" style={{ display: "inline-block", marginBottom: "14px", fontSize: "0.85rem", color: "#666", textDecoration: "none" }}>
          ← Back to Home
        </Link>
          <div className="doctor-auth-header">
            <h1>Doctor Login</h1>
            <p>You are already logged in. Please logout first.</p>
          </div>
          {inactiveMsg && <div className="doctor-message error">{inactiveMsg}</div>}
          <button type="button" className="doctor-submit-button" onClick={handleAlreadyLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-auth-page">
      <div className="doctor-login-card">
        <Link to="/" style={{ display: "inline-block", marginBottom: "14px", fontSize: "0.85rem", color: "#666", textDecoration: "none" }}>
          ← Back to Home
        </Link>
        <div className="doctor-auth-header">
          <h1>Doctor Login</h1>
          <p>
            only Admin-approved doctor account can login
          </p>
        </div>

        {inactiveMsg && (
          <div className="doctor-message error">{inactiveMsg}</div>
        )}

        {message && (
          <div className={`doctor-message ${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="doctor-form">
          <div className="doctor-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="doctor-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="doctor-submit-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="doctor-auth-footer">
          New Doctor?{" "}
          <Link to="/doctor-registration">Apply for Registration</Link>
        </p>
      </div>
    </div>
  );
};

export default DoctorLogin;
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/DoctorAuth.css";

const StaffLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5000/api/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Staff login failed.");
      }

      localStorage.setItem("staff", JSON.stringify(result.staff));

      setMessageType("success");
      setMessage("Login successful.");

      navigate("/staff-dashboard");
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctor-auth-page">
      <div className="doctor-login-card">
        <div className="doctor-auth-header">
          <h1>Staff Login</h1>
          <p>only Admin-approved staff account can login</p>
        </div>

        {message && (
          <div className={`doctor-message ${messageType}`}>{message}</div>
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
          New Staff?{" "}
          <Link to="/staff-registration">Apply for Registration</Link>
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

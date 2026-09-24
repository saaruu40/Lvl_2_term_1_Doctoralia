import { useState, useEffect } from "react";
import { Link,useNavigate } from "react-router-dom";
import "../styles/AdminLogin.css";

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    setMessage("");
    setMessageType("");
  };


  const navigate = useNavigate();

const handleSubmit = async (event) => {
  event.preventDefault();

  if (!formData.email.trim() || !formData.password) {
    setMessage("Please enter your email and password.");
    setMessageType("error");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/admin/login",
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
        result.message || "Admin login failed."
      );
    }
    localStorage.setItem("token", result.token);

    localStorage.setItem(
      "admin",
      JSON.stringify(result.admin)
    );

    setMessageType("success");
    setMessage("Admin Login Successful!");

    navigate("/admin-dashboard");

  } catch (error) {
    setMessageType("error");
    setMessage(error.message);
  }
};

  if (alreadyLoggedIn) {
    return (
      <main className="admin-login-page">
        <section className="login-card">
          <div className="login-heading">
            <h2>Admin Login</h2>
            <p>You are already logged in. Please logout first.</p>
          </div>
          {inactiveMsg && <div className="login-message error">{inactiveMsg}</div>}
          <button type="button" className="admin-login-button" onClick={handleAlreadyLogout}>Logout</button>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-login-page">
      <section className="login-card">
        <div className="login-heading">
          <h2>Admin Login</h2>
          <p>Login to your administrator account</p>
        </div>

        {inactiveMsg && (
          <div className="login-message error">{inactiveMsg}</div>
        )}

        {message && (
          <div className={`login-message ${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="login-form-group">
            <label htmlFor="email">Email Address</label>

            <input
              type="email"
              id="email"
              name="email"
              placeholder="sara@gmail.com"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </div>

          <div className="login-form-group">
            <label htmlFor="password">Password</label>

            <div className="login-password-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="login-show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" className="admin-login-button">
            Login
          </button>
        </form>

        <p className="register-text" style={{ fontSize: "0.85rem", color: "#666" }}>
          Single admin system — use <strong>sara@gmail.com / sara</strong> to login. Registration is disabled.
        </p>
      </section>
    </main>
  );
}

export default AdminLogin;
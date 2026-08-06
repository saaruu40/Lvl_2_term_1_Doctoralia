import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/AdminLogin.css";

function AdminLogin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      setMessage("Please enter your email and password.");
      setMessageType("error");
      return;
    }

    setMessage("Admin Login Successful!");
    setMessageType("success");

    setFormData({
      email: "",
      password: "",
    });

    setShowPassword(false);
  };

  return (
    <main className="admin-login-page">
      <section className="login-card">
        <div className="login-heading">
          <h2>Admin Login</h2>
          <p>Login to your administrator account</p>
        </div>

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
              placeholder="Enter your email address"
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

        <p className="register-text">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="register-link">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}

export default AdminLogin;
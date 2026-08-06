
import { Link } from "react-router-dom";
import { useState } from "react";
import "../styles/AdminRegister.css";

function AdminRegister() {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
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

    const {
      full_name,
      email,
      phone_number,
      password,
      confirm_password,
    } = formData;

    if (
      !full_name.trim() ||
      !email.trim() ||
      !phone_number.trim() ||
      !password ||
      !confirm_password
    ) {
      setMessage("Please fill in all the fields.");
      setMessageType("error");
      return;
    }

    if (full_name.trim().length < 3) {
      setMessage("Full name must contain at least 3 characters.");
      setMessageType("error");
      return;
    }

    const phonePattern = /^01[3-9]\d{8}$/;

    if (!phonePattern.test(phone_number)) {
      setMessage("Enter a valid Bangladeshi phone number.");
      setMessageType("error");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      setMessageType("error");
      return;
    }

    if (password !== confirm_password) {
      setMessage("Password and Confirm Password do not match.");
      setMessageType("error");
      return;
    }

    setMessage("Admin Registration Successful!");
    setMessageType("success");

    setFormData({
      full_name: "",
      email: "",
      phone_number: "",
      password: "",
      confirm_password: "",
    });

    setShowPassword(false);
  };

  return (
    <main className="admin-register-page">
      <section className="registration-card">
        <div className="registration-heading">
          <h2>Admin Registration</h2>
          <p>Create your administrator account</p>
        </div>

        {message && (
          <div className={`registration-message ${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="full_name">Full Name</label>

            <input
              type="text"
              id="full_name"
              name="full_name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChange={handleChange}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>

            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number</label>

            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              placeholder="Example: 01712345678"
              value={formData.phone_number}
              onChange={handleChange}
              maxLength="11"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
              />

              <button
                type="button"
                className="show-password-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm_password">
              Confirm Password
            </label>

            <input
              type={showPassword ? "text" : "password"}
              id="confirm_password"
              name="confirm_password"
              placeholder="Enter the password again"
              value={formData.confirm_password}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="register-button">
            Register Admin
          </button>
        </form>

        <p className="login-text">
          Already have an account?{" "}
          <Link to="/login" className="login-link">
         Login
  </Link>
        </p>
      </section>
    </main>
  );
}

export default AdminRegister;
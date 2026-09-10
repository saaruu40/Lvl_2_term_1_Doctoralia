import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/DoctorAuth.css";

const StaffRegistration = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirm_password: "",
    phone_number: "",
    gender: "",
  });

  const [profilePic, setProfilePic] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const [closedMsg, setClosedMsg] = useState("");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/staff/status");
        const data = await res.json();
        if (data.closed) {
          setClosed(true);
          setClosedMsg(data.message);
          setMessage(data.message);
          setMessageType("error");
        }
      } catch (e) {
        // ignore status fetch error, allow form
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    setProfilePic(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (formData.password !== formData.confirm_password) {
      setMessageType("error");
      setMessage("Password এবং Confirm Password মিলছে না।");
      return;
    }

    try {
      setLoading(true);

      const staffData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "confirm_password") {
          staffData.append(key, value);
        }
      });

      if (profilePic) {
        staffData.append("profile_pic", profilePic);
      }

      const response = await fetch("http://localhost:5000/api/staff/apply", {
        method: "POST",
        body: staffData,
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.closed || response.status === 403) {
          setClosed(true);
          setClosedMsg(result.message);
        }
        throw new Error(result.message || "Application can't be sent");
      }

      setMessageType("success");
      setMessage(
        "Application is successfully sent। You can login after admin approval"
      );

      setTimeout(() => {
        navigate("/staff-login");
      }, 2500);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="doctor-auth-page">
        <div className="doctor-register-card"><p>Checking registration status...</p></div>
      </div>
    );
  }

  return (
    <div className="doctor-auth-page">
      <div className="doctor-register-card">
        <div className="doctor-auth-header">
          <h1>Staff Application</h1>
          <p>
            {closed
              ? closedMsg || "Staff registration is closed. Only one staff is allowed."
              : "Apply giving proper information. Your account will activate after admin approval"}
          </p>
        </div>

        {message && (
          <div className={`doctor-message ${messageType}`}>{message}</div>
        )}

        {closed && (
          <div className="doctor-message error" style={{ marginBottom: 12 }}>
            Staff registration is closed. Only one staff registration is allowed and has already been taken. Please contact admin.
          </div>
        )}

        <form onSubmit={handleSubmit} className="doctor-form">
          <div className="doctor-form-grid">
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
              <label htmlFor="phone_number">Phone Number</label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="doctor-form-group">
              <label htmlFor="profile_pic">Profile Picture</label>
              <input
                type="file"
                id="profile_pic"
                name="profile_pic"
                accept="image/*"
                onChange={handleFileChange}
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
                placeholder="Create password"
                minLength="6"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="confirm_password">Confirm Password</label>
              <input
                type="password"
                id="confirm_password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm password"
                minLength="6"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="doctor-submit-button"
            disabled={loading || closed}
            title={closed ? "Registration closed" : undefined}
          >
            {closed ? "Registration Closed" : loading ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>

        <p className="doctor-auth-footer">
          Application already submitted?{" "}
          <Link to="/staff-login">Staff Login</Link>
        </p>
      </div>
    </div>
  );
};

export default StaffRegistration;

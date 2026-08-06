import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/DoctorAuth.css";

const DoctorRegistration = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
    phone_number: "",
    department_id: "",
    qualification: "",
    specification: "",
    medical_registration_no: "",
    new_patient_fee: "",
    followup_fee: "",
    max_patient_num: "",
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  const departments = [
    { department_id: 1, department_name: "Cardiology" },
    { department_id: 2, department_name: "Neurology" },
    { department_id: 3, department_name: "Dermatology" },
    { department_id: 4, department_name: "Orthopedics" },
    { department_id: 5, department_name: "Medicine" },
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleFileChange = (event) => {
    setProfilePhoto(event.target.files[0]);
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

      const doctorData = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key !== "confirm_password") {
          doctorData.append(key, value);
        }
      });

      if (profilePhoto) {
        doctorData.append("profile_photo", profilePhoto);
      }

      const response = await fetch(
        "http://localhost:5000/api/doctors/apply",
        {
          method: "POST",
          body: doctorData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Application can't be sent");
      }

      setMessageType("success");
      setMessage(
        "Application is successfully sent। You can login after admin approval"
      );

      setTimeout(() => {
        navigate("/doctor-login");
      }, 2500);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="doctor-auth-page">
      <div className="doctor-register-card">
        <div className="doctor-auth-header">
          <h1>Doctor Application</h1>
          <p>
            Apply giving proper information. Your account will activate after admin approval
          </p>
        </div>

        {message && (
          <div className={`doctor-message ${messageType}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="doctor-form">
          <div className="doctor-form-grid">
            <div className="doctor-form-group">
              <label htmlFor="full_name">Full Name</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

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
              <label htmlFor="department_id">Department</label>
              <select
                id="department_id"
                name="department_id"
                value={formData.department_id}
                onChange={handleChange}
                required
              >
                <option value="">Select department</option>

                {departments.map((department) => (
                  <option
                    key={department.department_id}
                    value={department.department_id}
                  >
                    {department.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="doctor-form-group">
              <label htmlFor="qualification">Qualification</label>
              <input
                type="text"
                id="qualification"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                placeholder="Example: MBBS, FCPS"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="specification">Specialization</label>
              <input
                type="text"
                id="specification"
                name="specification"
                value={formData.specification}
                onChange={handleChange}
                placeholder="Example: Cardiologist"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="medical_registration_no">
                Medical Registration Number
              </label>

              <input
                type="text"
                id="medical_registration_no"
                name="medical_registration_no"
                value={formData.medical_registration_no}
                onChange={handleChange}
                placeholder="Enter registration number"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="profile_photo">Profile Photo</label>
              <input
                type="file"
                id="profile_photo"
                name="profile_photo"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="new_patient_fee">New Patient Fee</label>
              <input
                type="number"
                id="new_patient_fee"
                name="new_patient_fee"
                value={formData.new_patient_fee}
                onChange={handleChange}
                placeholder="Enter fee"
                min="0"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="followup_fee">Follow-up Fee</label>
              <input
                type="number"
                id="followup_fee"
                name="followup_fee"
                value={formData.followup_fee}
                onChange={handleChange}
                placeholder="Enter follow-up fee"
                min="0"
                required
              />
            </div>

            <div className="doctor-form-group">
              <label htmlFor="max_patient_num">
                Maximum Patients Per Day
              </label>

              <input
                type="number"
                id="max_patient_num"
                name="max_patient_num"
                value={formData.max_patient_num}
                onChange={handleChange}
                placeholder="Example: 20"
                min="1"
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
            disabled={loading}
          >
            {loading ? "Submitting Application..." : "Submit Application"}
          </button>
        </form>

        <p className="doctor-auth-footer">
          Application already submitted?{" "}
          <Link to="/doctor-login">Doctor Login</Link>
        </p>
      </div>
    </div>
  );
};

export default DoctorRegistration;
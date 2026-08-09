const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const pool = require("./config/db");
const doctorRoutes = require("./routes/doctorRoutes");
const staffRoutes = require("./routes/staffRoutes");
const patientRoutes = require("./routes/patientRoutes");
const adminRoutes = require("./routes/adminRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const complaintRoutes = require("./routes/complaintRoutes");


const app = express();


app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/api/doctors", doctorRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/complaints", complaintRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Doctoralia backend is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT current_database(), CURRENT_TIMESTAMP"
    );

    res.status(200).json({
      message: "Database connection successful",
      database: result.rows[0].current_database,
      time: result.rows[0].current_timestamp,
    });
  } catch (error) {
    res.status(500).json({
      message: "Database connection failed",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

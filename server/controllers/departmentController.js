const pool = require("../config/db");

// GET all departments
const getDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT department_id, department_name, description
       FROM department
       ORDER BY department_id`
    );

    return res.status(200).json({
      message: "Departments fetched successfully.",
      departments: result.rows,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      message: "Could not fetch departments.",
      error: error.message,
    });
  }
};

// GET one department
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT department_id, department_name, description
       FROM department
       WHERE department_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      department: result.rows[0],
    });
  } catch (error) {
    console.error("Get department error:", error);

    return res.status(500).json({
      message: "Could not fetch department.",
      error: error.message,
    });
  }
};

// CREATE department
const createDepartment = async (req, res) => {
  try {
    const { department_name, description } = req.body;

    if (!department_name) {
      return res.status(400).json({
        message: "department_name is required.",
      });
    }

    const existing = await pool.query(
      `SELECT department_id
       FROM department
       WHERE LOWER(department_name) = LOWER($1)`,
      [department_name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        message: "Department already exists.",
      });
    }

    const result = await pool.query(
      `INSERT INTO department (
        department_name,
        description
      )
      VALUES ($1, $2)
      RETURNING department_id, department_name, description`,
      [department_name, description || null]
    );

    return res.status(201).json({
      message: "Department created successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    console.error("Create department error:", error);

    return res.status(500).json({
      message: "Could not create department.",
      error: error.message,
    });
  }
};

// UPDATE department
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, description } = req.body;

    const result = await pool.query(
      `UPDATE department
       SET
         department_name = COALESCE($1, department_name),
         description = COALESCE($2, description)
       WHERE department_id = $3
       RETURNING department_id, department_name, description`,
      [
        department_name || null,
        description ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      message: "Department updated successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    console.error("Update department error:", error);

    return res.status(500).json({
      message: "Could not update department.",
      error: error.message,
    });
  }
};

// DELETE department
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM department
       WHERE department_id = $1
       RETURNING department_id, department_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Department not found.",
      });
    }

    return res.status(200).json({
      message: "Department deleted successfully.",
      department: result.rows[0],
    });
  } catch (error) {
    console.error("Delete department error:", error);

    return res.status(500).json({
      message: "Could not delete department.",
      error: error.message,
    });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
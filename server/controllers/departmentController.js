const pool = require("../config/db");

// GET all departments (supports ?search= for Admin search bar)
const getDepartments = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT department_id, department_name, description,status FROM department`;
    const values = [];
    if (search && search.trim()) {
      query += ` WHERE LOWER(department_name) LIKE LOWER($1)`;
      values.push(`%${search.trim()}%`);
    }
    query += ` ORDER BY department_id`;
    const result = await pool.query(query, values);

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

// UPDATE department (rename — preserves department_id FK, blocks duplicate)
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, description } = req.body;
    if (department_name) {
      const dup = await pool.query(
        `SELECT department_id FROM department WHERE LOWER(department_name)=LOWER($1) AND department_id<>$2`,
        [department_name.trim(), id]
      );
      if (dup.rows.length > 0) return res.status(409).json({ message: "Department already exists." });
    }

    const result = await pool.query(
      `UPDATE department
       SET
         department_name = COALESCE($1, department_name),
         description = COALESCE($2, description)
       WHERE department_id = $3
       RETURNING department_id, department_name, description`,
      [
        department_name ? department_name.trim() : null,
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

// DELETE department — blocked if any doctor assigned (FK safety)
const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const docCheck = await pool.query(`SELECT COUNT(*) FROM doctor WHERE department_id=$1`, [id]);
    if (Number(docCheck.rows[0].count) > 0) {
      return res.status(409).json({ message: "This department cannot be deleted because doctors are currently assigned to it. Doctor exists in this department." });
    }

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
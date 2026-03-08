import { db } from "../config/db.js";

// ── GET all fields ─────────────────────────────────────────────────────────
export const getAllFields = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.field_id,
        f.field_name,
        f.location,
        f.area,
        f.crop_id,
        c.crop_name,
        f.supervisor_id,
        u.full_name AS supervisor_name
      FROM fields f
      JOIN crops c ON f.crop_id    = c.crop_id
      JOIN users u ON f.supervisor_id = u.user_id
      ORDER BY f.field_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET single field ───────────────────────────────────────────────────────
export const getFieldById = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const [rows] = await db.query(`
      SELECT
        f.field_id, f.field_name, f.location, f.area,
        f.crop_id, c.crop_name,
        f.supervisor_id, u.full_name AS supervisor_name
      FROM fields f
      JOIN crops c ON f.crop_id    = c.crop_id
      JOIN users u ON f.supervisor_id = u.user_id
      WHERE f.field_id = ?
    `, [fieldId]);

    if (rows.length === 0) return res.status(404).json({ error: "Field not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── CREATE field ───────────────────────────────────────────────────────────
export const createField = async (req, res) => {
  try {
    const { field_name, crop_id, location, area, supervisor_id } = req.body;

    if (!field_name || !crop_id || !location || !area || !supervisor_id) {
      return res.status(400).json({
        error: "field_name, crop_id, location, area and supervisor_id are all required"
      });
    }

    // Only allow SUPERVISOR role (role_id = 2)
    const [supCheck] = await db.query(
      "SELECT user_id FROM users WHERE user_id = ? AND role_id = 2 AND status = 'ACTIVE'",
      [supervisor_id]
    );
    if (supCheck.length === 0) {
      return res.status(400).json({ error: "Selected user is not an active SUPERVISOR" });
    }

    const [result] = await db.query(
      `INSERT INTO fields (field_name, crop_id, location, area, supervisor_id)
       VALUES (?, ?, ?, ?, ?)`,
      [field_name, Number(crop_id), location, parseFloat(area), Number(supervisor_id)]
    );

    // Return the full row with joined names
    const [newRow] = await db.query(`
      SELECT f.field_id, f.field_name, f.location, f.area,
             f.crop_id, c.crop_name,
             f.supervisor_id, u.full_name AS supervisor_name
      FROM fields f
      JOIN crops c ON f.crop_id    = c.crop_id
      JOIN users u ON f.supervisor_id = u.user_id
      WHERE f.field_id = ?
    `, [result.insertId]);

    res.status(201).json(newRow[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── UPDATE field ───────────────────────────────────────────────────────────
export const updateField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const { field_name, crop_id, location, area, supervisor_id } = req.body;

    // Validate supervisor role if being changed
    if (supervisor_id) {
      const [supCheck] = await db.query(
        "SELECT user_id FROM users WHERE user_id = ? AND role_id = 2 AND status = 'ACTIVE'",
        [supervisor_id]
      );
      if (supCheck.length === 0) {
        return res.status(400).json({ error: "Selected user is not an active SUPERVISOR" });
      }
    }

    await db.query(
      `UPDATE fields SET
        field_name    = COALESCE(?, field_name),
        crop_id       = COALESCE(?, crop_id),
        location      = COALESCE(?, location),
        area          = COALESCE(?, area),
        supervisor_id = COALESCE(?, supervisor_id)
       WHERE field_id = ?`,
      [
        field_name || null,
        crop_id    ? Number(crop_id)          : null,
        location   || null,
        area       ? parseFloat(area)         : null,
        supervisor_id ? Number(supervisor_id) : null,
        fieldId
      ]
    );

    const [updated] = await db.query(`
      SELECT f.field_id, f.field_name, f.location, f.area,
             f.crop_id, c.crop_name,
             f.supervisor_id, u.full_name AS supervisor_name
      FROM fields f
      JOIN crops c ON f.crop_id    = c.crop_id
      JOIN users u ON f.supervisor_id = u.user_id
      WHERE f.field_id = ?
    `, [fieldId]);

    if (updated.length === 0) return res.status(404).json({ error: "Field not found" });
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── DELETE field ───────────────────────────────────────────────────────────
export const deleteField = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const [result] = await db.query("DELETE FROM fields WHERE field_id = ?", [fieldId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Field not found" });
    res.json({ message: "Field deleted", fieldId: Number(fieldId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET supervisors only (role_id = 2, ACTIVE) ────────────────────────────
export const getSupervisors = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT user_id, full_name, email, phone
       FROM users
       WHERE role_id = 2 AND status = 'ACTIVE'
       ORDER BY full_name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
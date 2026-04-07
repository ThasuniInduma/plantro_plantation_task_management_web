import { db } from "../config/db.js";

// GET /api/fields
export const getAllFields = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area,
              f.supervisor_id, f.crop_id,
              c.crop_name,
              u.full_name AS supervisor_name
       FROM fields f
       LEFT JOIN crops      c ON f.crop_id       = c.crop_id
       LEFT JOIN users      u ON f.supervisor_id  = u.user_id
       ORDER BY f.field_id`
    );
    res.json(rows);
  } catch (err) {
    console.error("getAllFields error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET /api/fields/:id
export const getFieldById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area,
              f.supervisor_id, f.crop_id,
              c.crop_name,
              u.full_name AS supervisor_name
       FROM fields f
       LEFT JOIN crops c ON f.crop_id      = c.crop_id
       LEFT JOIN users u ON f.supervisor_id = u.user_id
       WHERE f.field_id = ?`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Field not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("getFieldById error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// POST /api/fields
export const createField = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { field_name, crop_id, location, area, supervisor_id } = req.body;
    if (!field_name || !crop_id || !location || !area || !supervisor_id)
      return res.status(400).json({ error: "All required fields must be filled" });

    const [result] = await conn.query(
      `INSERT INTO fields (field_name, crop_id, location, area, supervisor_id) VALUES (?, ?, ?, ?, ?)`,
      [field_name, Number(crop_id), location, parseFloat(area), Number(supervisor_id)]
    );
    const fieldId = result.insertId;

    const [cropTasks] = await conn.query(
      `SELECT crop_task_id, task_id, frequency_days FROM crop_tasks WHERE crop_id = ?`,
      [crop_id]
    );
    const today = new Date().toISOString().split("T")[0];
    for (const ct of cropTasks) {
      await conn.query(
        `INSERT INTO field_task_schedule (field_id, task_id, crop_task_id, next_due_date) VALUES (?, ?, ?, ?)`,
        [fieldId, ct.task_id, ct.crop_task_id, today]
      );
    }
    await conn.commit();

    const [rows] = await conn.query(
      `SELECT f.field_id, f.field_name, f.location, f.area,
              f.supervisor_id, f.crop_id, c.crop_name, u.full_name AS supervisor_name
       FROM fields f
       LEFT JOIN crops c ON f.crop_id = c.crop_id
       LEFT JOIN users u ON f.supervisor_id = u.user_id
       WHERE f.field_id = ?`,
      [fieldId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error("createField error:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
};

// PUT /api/fields/:id
export const updateField = async (req, res) => {
  try {
    const { id } = req.params;
    const { field_name, crop_id, location, area, supervisor_id } = req.body;
    if (!field_name || !crop_id || !location || !area || !supervisor_id)
      return res.status(400).json({ error: "All required fields must be filled" });

    const [check] = await db.query("SELECT field_id FROM fields WHERE field_id = ?", [id]);
    if (!check.length) return res.status(404).json({ error: "Field not found" });

    await db.query(
      `UPDATE fields SET field_name=?, crop_id=?, location=?, area=?, supervisor_id=? WHERE field_id=?`,
      [field_name, Number(crop_id), location, parseFloat(area), Number(supervisor_id), id]
    );
    const [rows] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area,
              f.supervisor_id, f.crop_id, c.crop_name, u.full_name AS supervisor_name
       FROM fields f
       LEFT JOIN crops c ON f.crop_id      = c.crop_id
       LEFT JOIN users u ON f.supervisor_id = u.user_id
       WHERE f.field_id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("updateField error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// DELETE /api/fields/:id
export const deleteField = async (req, res) => {
  try {
    const { id } = req.params;
    const [check] = await db.query("SELECT field_id FROM fields WHERE field_id = ?", [id]);
    if (!check.length) return res.status(404).json({ error: "Field not found" });
    await db.query("DELETE FROM fields WHERE field_id = ?", [id]);
    res.json({ message: "Field deleted", field_id: Number(id) });
  } catch (err) {
    console.error("deleteField error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET /api/fields/supervisors
export const getSupervisors = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email
       FROM users u WHERE u.role_id = 2 AND u.status = 'ACTIVE' ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (err) {
    console.error("getSupervisors error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── NEW: GET /api/fields/:id/tasks  — schedule + done tasks ──────────────────
export const getFieldTasks = async (req, res) => {
  try {
    const { id } = req.params;
    // Scheduled tasks with latest assignment status
    const [scheduled] = await db.query(
      `SELECT
         fts.schedule_id,
         fts.task_id,
         fts.crop_task_id,
         fts.last_done_date,
         fts.next_due_date,
         fts.is_dismissed,
         fts.pending_verification,
         fts.pending_assignment_id,
         t.task_name,
         t.description,
         ct.frequency_days,
         ct.estimated_man_hours,
         DATEDIFF(fts.next_due_date, CURDATE()) AS days_until_due,
         (SELECT ta.status
          FROM task_assignments ta
          WHERE ta.task_id = fts.task_id AND ta.field_id = fts.field_id
          ORDER BY ta.created_at DESC LIMIT 1) AS latest_assignment_status,
         (SELECT u.full_name
          FROM task_assignments ta
          JOIN workers w ON ta.worker_id = w.worker_id
          JOIN users u ON w.user_id = u.user_id
          WHERE ta.task_id = fts.task_id AND ta.field_id = fts.field_id
          ORDER BY ta.created_at DESC LIMIT 1) AS assigned_worker_name
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       WHERE fts.field_id = ?
       ORDER BY fts.next_due_date ASC`,
      [id]
    );

    // Completed task assignments
    const [completed] = await db.query(
      `SELECT
         ta.assignment_id,
         ta.task_id,
         ta.status,
         ta.assigned_date,
         ta.completed_at,
         ta.expected_hours,
         ta.actual_hours,
         ta.remarks,
         t.task_name,
         t.description,
         u.full_name AS worker_name
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.task_id
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.field_id = ? AND ta.status = 'completed'
       ORDER BY ta.completed_at DESC`,
      [id]
    );

    res.json({ scheduled, completed });
  } catch (err) {
    console.error("getFieldTasks error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── NEW: GET /api/fields/workers — all workers with user info ─────────────────
export const getWorkers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT w.worker_id, w.user_id, w.skills, w.max_daily_hours,
              u.full_name, u.email, u.phone
       FROM workers w
       JOIN users u ON w.user_id = u.user_id
       WHERE u.status = 'ACTIVE'
       ORDER BY u.full_name`
    );
    res.json(rows);
  } catch (err) {
    console.error("getWorkers error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── NEW: POST /api/fields/:id/assign — assign a task to a worker ──────────────
export const assignTask = async (req, res) => {
  try {
    const { id } = req.params;                          // field_id
    const { task_id, worker_id, assigned_date, expected_hours, remarks, assigned_by } = req.body;

    if (!task_id || !worker_id || !assigned_date)
      return res.status(400).json({ error: "task_id, worker_id and assigned_date are required" });

    const [result] = await db.query(
      `INSERT INTO task_assignments
         (task_id, field_id, worker_id, assigned_by, status, assigned_date, expected_hours, remarks)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        Number(task_id),
        Number(id),
        Number(worker_id),
        assigned_by ? Number(assigned_by) : null,
        assigned_date,
        expected_hours ? Number(expected_hours) : null,
        remarks || null
      ]
    );

    const [rows] = await db.query(
      `SELECT ta.*, t.task_name, u.full_name AS worker_name
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.task_id
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.assignment_id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("assignTask error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
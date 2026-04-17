import { db } from "../config/db.js";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getWorkerIdByUserId = async (userId) => {
  const [rows] = await db.query(
    "SELECT worker_id FROM workers WHERE user_id = ?",
    [userId]
  );
  return rows.length ? rows[0].worker_id : null;
};

const formatStatus = (status) => {
  const map = {
    pending: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
    rejected: "Rejected",
  };
  return map[status] || "Assigned";
};

// ─────────────────────────────────────────────
// GET WORKERS
// ─────────────────────────────────────────────
export const getAllWorkers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        w.worker_id,
        u.full_name,
        u.email,
        u.phone,
        w.skills,
        w.preferred_locations
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workers" });
  }
};

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────
export const checkProfileStatus = async (req, res) => {
  try {
    const workerId = await getWorkerIdByUserId(req.user.id);
    res.json({ profileComplete: !!workerId, workerId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const createWorkerProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const existing = await getWorkerIdByUserId(userId);
    if (existing) {
      return res.status(400).json({ success: false, message: "Profile exists" });
    }

    const {
      skills = [],
      preferred_locations = [],
      max_daily_hours = 8,
    } = req.body;

    await db.query(
      `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(skills),
        JSON.stringify(preferred_locations),
        max_daily_hours,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getWorkerProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT u.*, w.*
       FROM users u
       LEFT JOIN workers w ON u.user_id = w.user_id
       WHERE u.user_id = ?`,
      [userId]
    );

    const row = rows[0];

    res.json({
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      worker_id: row.worker_id,
      skills: JSON.parse(row.skills || "[]"),
      preferred_locations: JSON.parse(row.preferred_locations || "[]"),
      max_daily_hours: row.max_daily_hours,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateWorkerProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      full_name,
      phone,
      skills = [],
      preferred_locations = [],
      max_daily_hours = 8,
    } = req.body;

    await db.query(
      "UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?",
      [full_name, phone, userId]
    );

    const workerId = await getWorkerIdByUserId(userId);

    if (workerId) {
      await db.query(
        `UPDATE workers
         SET skills = ?, preferred_locations = ?, max_daily_hours = ?
         WHERE worker_id = ?`,
        [
          JSON.stringify(skills),
          JSON.stringify(preferred_locations),
          max_daily_hours,
          workerId,
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// TASKS (FIXED)
// ─────────────────────────────────────────────
export const getWorkerTasks = async (req, res) => {
  try {
    const workerId = await getWorkerIdByUserId(req.user.id);
    if (!workerId) return res.json({ success: true, todayTasks: [], tomorrowTasks: [] });

    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const [rows] = await db.query(
      `SELECT
        ta.assignment_id,
        ta.status,
        ta.assigned_date,
        ta.expected_hours,
        ta.completed_at,
        ta.verified_by,
        ta.verified_at,
        ta.deadline_time,
        t.task_name,
        t.description,
        f.field_name,
        f.location,
        c.crop_name,
        fts.schedule_id,
        fts.pending_verification,
        u.full_name AS supervisor_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.task_id
      JOIN fields f ON ta.field_id = f.field_id
      JOIN crops c ON f.crop_id = c.crop_id
      LEFT JOIN field_task_schedule fts
             ON fts.task_id = ta.task_id AND fts.field_id = ta.field_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE ta.worker_id = ?
        AND ta.assigned_date IN (?, ?)
        AND ta.status NOT IN ('rejected')`,
      [workerId, today, tomorrow]   // NOTE: worker_id here = users.user_id per your schema
    );

    // For each task, get teammates assigned to same task+field+date
    const enriched = await Promise.all(rows.map(async (r) => {
      const [teammates] = await db.query(
        `SELECT u.full_name
         FROM task_assignments ta2
         JOIN users u ON ta2.worker_id = u.user_id
         WHERE ta2.task_id = ? AND ta2.field_id = ?
           AND ta2.assigned_date = ?
           AND ta2.worker_id != ?
           AND ta2.status != 'rejected'`,
        [r.task_id, r.field_id, r.assigned_date, workerId]
      );

      return {
        id:                   r.assignment_id,
        name:                 r.task_name,
        description:          r.description,
        field:                r.field_name,
        crop:                 r.crop_name,
        location:             r.location,
        estimatedTime:        r.expected_hours,
        status:               formatStatus(r.status),
        rawStatus:            r.status,
        date:                 r.assigned_date instanceof Date
                                ? r.assigned_date.toISOString().split('T')[0]
                                : String(r.assigned_date).split('T')[0],
        deadline_time:        r.deadline_time,
        pending_verification: r.status === 'completed' && !r.verified_at,
        schedule_id:          r.schedule_id,
        supervisor:           r.supervisor_name || 'N/A',
        team:                 teammates.map(t => t.full_name),
      };
    }));

    const dateStr = (d) => (d instanceof Date ? d.toISOString() : String(d)).split('T')[0];

    res.json({
      success: true,
      todayTasks:    enriched.filter(t => t.date === today),
      tomorrowTasks: enriched.filter(t => t.date === tomorrow),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE STATUS
// ─────────────────────────────────────────────
export const updateTaskStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;

    if (status === "completed") {
      await db.query(
        `UPDATE task_assignments
         SET status = 'completed',
             completed_at = CURDATE(),
             verified_by = NULL,
             verified_at = NULL
         WHERE assignment_id = ?`,
        [assignmentId]
      );
    } else {
      await db.query(
        `UPDATE task_assignments
         SET status = ?
         WHERE assignment_id = ?`,
        [status, assignmentId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// POSTPONE TASK
// ─────────────────────────────────────────────
export const postponeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;

    await db.query(
      `UPDATE task_assignments
       SET assigned_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY),
           status = 'pending',
           remarks = ?
       WHERE assignment_id = ?`,
      [reason, taskId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────
export const markAttendance = async (req, res) => {
  try {
    const workerId = await getWorkerIdByUserId(req.user.id);
    const { date, status } = req.body;

    await db.query(
      `INSERT INTO worker_availability (worker_id, date, available_hours, status)
       VALUES (?, ?, 8, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [workerId, date, status]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getAttendanceStatus = async (req, res) => {
  try {
    const workerId = await getWorkerIdByUserId(req.user.id);
    const { date } = req.query;

    const [rows] = await db.query(
      `SELECT status FROM worker_availability
       WHERE worker_id = ? AND date = ?`,
      [workerId, date]
    );

    if (!rows.length) {
      return res.json({ marked: false, status: null });
    }

    res.json({
      marked: true,
      status: rows[0].status,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// GET /api/worker/my-workers (for supervisor)
export const getWorkersForSupervisor = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(`
      SELECT DISTINCT
        w.worker_id,
        u.full_name
      FROM supervisors s
      JOIN workers w ON JSON_CONTAINS(w.preferred_locations, CAST(s.field_id AS JSON))
      JOIN users u ON u.user_id = w.user_id
      WHERE s.user_id = ?
    `, [userId]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
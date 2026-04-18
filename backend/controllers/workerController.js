import { db } from "../config/db.js";

const getWorkerIdByUserId = async (userId) => {
  const [rows] = await db.query(
    "SELECT worker_id FROM workers WHERE user_id = ?",
    [userId]
  );
  return rows.length ? rows[0].worker_id : null;
};

const formatStatus = (status) => {
  const map = {
    pending:     "Assigned",
    in_progress: "In Progress",
    completed:   "Completed",
    rejected:    "Rejected",
  };
  return map[status] || "Assigned";
};

// GET ALL WORKERS
export const getAllWorkers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT w.worker_id, u.full_name, u.email, u.phone, w.skills, w.preferred_locations
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch workers" });
  }
};

// PROFILE
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
    const userId   = req.user.id;
    const existing = await getWorkerIdByUserId(userId);
    if (existing) return res.status(400).json({ success: false, message: "Profile exists" });

    const { skills = [], preferred_locations = [], max_daily_hours = 8 } = req.body;
    await db.query(
      `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours) VALUES (?, ?, ?, ?)`,
      [userId, JSON.stringify(skills), JSON.stringify(preferred_locations), max_daily_hours]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getWorkerProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, u.email, u.phone, u.created_at,
              w.worker_id, w.skills, w.preferred_locations, w.max_daily_hours, w.profile_completed
       FROM users u 
       LEFT JOIN workers w ON u.user_id = w.user_id 
       WHERE u.user_id = ?`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const row = rows[0];

    // Safely parse JSON fields — they may be null if worker row doesn't exist yet
    const parseJSON = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };
    const [locationRows] = await db.query(
      `SELECT f.location
      FROM fields f
      WHERE f.field_id IN (${parseJSON(row.preferred_locations).map(() => '?').join(',')})`,
      parseJSON(row.preferred_locations)
    );

const locations = locationRows.map(l => l.location);

    res.json({
      user_id:             row.user_id,
      full_name:           row.full_name,
      email:               row.email,
      phone:               row.phone,
      created_at:          row.created_at,
      worker_id:           row.worker_id || null,
      skills:              parseJSON(row.skills),
      preferred_locations: locations,
      max_daily_hours:     row.max_daily_hours || 8,
      profile_completed:   row.profile_completed || 0,
    });
  } catch (err) {
    console.error("getWorkerProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const updateWorkerProfile = async (req, res) => {
  try {
    const { full_name, phone, skills = [], preferred_locations = [], max_daily_hours = 8 } = req.body;

    await db.query(
      "UPDATE users SET full_name = ?, phone = ? WHERE user_id = ?",
      [full_name, phone, req.user.id]
    );

    const workerId = await getWorkerIdByUserId(req.user.id);

    if (workerId) {
      // Worker row exists — update it
      await db.query(
        `UPDATE workers SET skills = ?, preferred_locations = ?, max_daily_hours = ? WHERE worker_id = ?`,
        [JSON.stringify(skills), JSON.stringify(preferred_locations), max_daily_hours, workerId]
      );
    } else {
      // No worker row yet — create one
      await db.query(
        `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
         VALUES (?, ?, ?, ?, 1)`,
        [req.user.id, JSON.stringify(skills), JSON.stringify(preferred_locations), max_daily_hours]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("updateWorkerProfile error:", err);
    res.status(500).json({ message: err.message });
  }
};

// GET WORKER TASKS — today + tomorrow, with teammates, canAct logic
export const getWorkerTasks = async (req, res) => {
  try {
    const userId   = req.user.id;
    const workerId = await getWorkerIdByUserId(userId);

    if (!workerId) {
      return res.json({ success: true, todayTasks: [], tomorrowTasks: [] });
    }

    const [rows] = await db.query(
      `SELECT
        ta.assignment_id, ta.task_id, ta.field_id,
        ta.status, ta.assigned_date, ta.expected_hours,
        ta.completed_at, ta.verified_by, ta.verified_at,
        ta.deadline_time, ta.remarks,
        t.task_name, t.description,
        f.field_name, f.location,
        c.crop_name,
        fts.schedule_id,
        COALESCE(fts.pending_verification, 0) AS pending_verification,
        u.full_name AS supervisor_name,
        CURDATE()                           AS today,
        DATE_ADD(CURDATE(), INTERVAL 1 DAY) AS tomorrow
      FROM task_assignments ta
      JOIN tasks  t  ON ta.task_id  = t.task_id
      JOIN fields f  ON ta.field_id = f.field_id
      JOIN crops  c  ON f.crop_id   = c.crop_id
      LEFT JOIN field_task_schedule fts
             ON fts.task_id  = ta.task_id
            AND fts.field_id = ta.field_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u       ON s.user_id  = u.user_id
      WHERE ta.worker_id = ?
        AND ta.assigned_date IN (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY))
        AND ta.status NOT IN ('rejected')`,
      [workerId]
    );

    const toDateStr = (val) =>
      val instanceof Date
        ? val.toISOString().split("T")[0]
        : String(val ?? "").split("T")[0];

    const today    = rows.length ? toDateStr(rows[0].today)    : new Date().toLocaleDateString("en-CA");
    const tomorrow = rows.length ? toDateStr(rows[0].tomorrow) : "";

    const enriched = await Promise.all(
      rows.map(async (r) => {
        // Teammates
        const [teammates] = await db.query(
          `SELECT u.full_name
           FROM task_assignments ta2
           JOIN workers w2 ON ta2.worker_id = w2.worker_id
           JOIN users   u  ON w2.user_id    = u.user_id
           WHERE ta2.task_id      = ?
             AND ta2.field_id     = ?
             AND ta2.assigned_date= ?
             AND ta2.worker_id   != ?
             AND ta2.status      != 'rejected'`,
          [r.task_id, r.field_id, r.assigned_date, workerId]
        );

        // ONE-WORKER-COMPLETES RULE
        const [siblings] = await db.query(
          `SELECT assignment_id, status, worker_id
           FROM task_assignments
           WHERE task_id       = ?
             AND field_id      = ?
             AND assigned_date = ?
             AND status IN ('completed','in_progress')
             AND worker_id    != ?
             AND status       != 'rejected'`,
          [r.task_id, r.field_id, r.assigned_date, workerId]
        );

        const siblingCompleted  = siblings.some(s => s.status === 'completed');
        const siblingInProgress = siblings.some(s => s.status === 'in_progress');
        const canAct = r.status !== 'pending'
          ? true
          : !siblingCompleted && !siblingInProgress;

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
          date:                 toDateStr(r.assigned_date),
          deadline_time:        r.deadline_time,
          remarks:              r.remarks,
          pending_verification: r.pending_verification === 1,
          schedule_id:          r.schedule_id,
          supervisor:           r.supervisor_name || "N/A",
          team:                 teammates.map(t => t.full_name),
          canAct,
          siblingCompleted,
        };
      })
    );

    res.json({
      success:       true,
      todayTasks:    enriched.filter(t => t.date === today),
      tomorrowTasks: enriched.filter(t => t.date === tomorrow),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE TASK STATUS (start / complete) — called from worker dashboard
export const updateTaskStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status }       = req.body;
    const userId           = req.user.id;
    const workerId         = await getWorkerIdByUserId(userId);

    const [[assignment]] = await db.query(
      `SELECT * FROM task_assignments WHERE assignment_id = ?`,
      [assignmentId]
    );
    if (!assignment)             return res.status(404).json({ message: "Assignment not found" });
    if (assignment.worker_id !== workerId) return res.status(403).json({ message: "Not your assignment" });

    if (status === "in_progress" || status === "completed") {
      const [siblings] = await db.query(
        `SELECT assignment_id FROM task_assignments
         WHERE task_id       = ?
           AND field_id      = ?
           AND assigned_date = ?
           AND worker_id    != ?
           AND status IN ('in_progress','completed')`,
        [assignment.task_id, assignment.field_id, assignment.assigned_date, workerId]
      );
      if (siblings.length > 0) {
        return res.status(409).json({
          message: "Another worker has already claimed this task. Only one worker completes it.",
        });
      }
    }

    if (status === "completed") {
      // Mark all siblings completed too
      await db.query(
        `UPDATE task_assignments
         SET status = 'completed', completed_at = CURDATE(), verified_by = NULL, verified_at = NULL
         WHERE task_id = ? AND field_id = ? AND assigned_date = ?`,
        [assignment.task_id, assignment.field_id, assignment.assigned_date]
      );

      // Mark schedule for verification
      await db.query(
        `UPDATE field_task_schedule SET pending_verification = 1
         WHERE task_id = ? AND field_id = ?`,
        [assignment.task_id, assignment.field_id]
      );

      // Notify supervisor
      const [[sup]] = await db.query(
        `SELECT s.user_id, u.full_name, u.email
         FROM supervisors s
         JOIN users u ON s.user_id = u.user_id
         WHERE s.field_id = ?`,
        [assignment.field_id]
      );

      if (sup) {
        const [[worker]]   = await db.query(
          `SELECT u.full_name FROM users u JOIN workers w ON w.user_id = u.user_id WHERE w.worker_id = ?`,
          [workerId]
        );
        const [[taskInfo]] = await db.query(
          `SELECT t.task_name, f.field_name FROM tasks t, fields f WHERE t.task_id = ? AND f.field_id = ?`,
          [assignment.task_id, assignment.field_id]
        );

        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES (?, ?, ?, 'task_completed', ?)`,
          [
            sup.user_id,
            "✅ Task Ready for Verification",
            `${worker?.full_name || "A worker"} has completed "${taskInfo?.task_name}" at ${taskInfo?.field_name}. Please verify.`,
            assignmentId,
          ]
        );
      }
    } else {
      await db.query(
        `UPDATE task_assignments SET status = ? WHERE assignment_id = ?`,
        [status, assignmentId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POSTPONE TASK
export const postponeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;

    const [[assignment]] = await db.query(
      `SELECT * FROM task_assignments WHERE assignment_id = ?`,
      [taskId]
    );
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    await db.query(
      `UPDATE task_assignments
       SET assigned_date = DATE_ADD(CURDATE(), INTERVAL 1 DAY), status = 'pending', remarks = ?
       WHERE task_id = ? AND field_id = ? AND assigned_date = CURDATE() AND status NOT IN ('completed')`,
      [reason, assignment.task_id, assignment.field_id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ATTENDANCE
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
      `SELECT status FROM worker_availability WHERE worker_id = ? AND date = ?`,
      [workerId, date]
    );
    if (!rows.length) return res.json({ marked: false, status: null });
    res.json({ marked: true, status: rows[0].status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET WORKERS FOR SUPERVISOR
export const getWorkersForSupervisor = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT w.worker_id, u.full_name
       FROM supervisors s
       JOIN workers w 
         ON JSON_CONTAINS(w.preferred_locations, CAST(s.field_id AS JSON))
       JOIN users u 
         ON u.user_id = w.user_id
       WHERE s.user_id = ?
       AND w.user_id NOT IN (
         SELECT user_id FROM supervisors
       )`,
      [req.user.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
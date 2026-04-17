import { db } from "../config/db.js";

// GET /api/assignments?date=2026-01-28
export const getTasksForDate = async (req, res) => {
  try {
    const { date } = req.query;
    const supervisorUserId = req.user?.id;

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!date) return res.status(400).json({ error: "date query param required" });

    const [fields] = await db.query(
      `SELECT 
        f.field_id, 
        f.field_name, 
        f.crop_id, 
        c.crop_name, 
        f.location
      FROM fields f
      JOIN crops c ON f.crop_id = c.crop_id
      JOIN supervisors s ON f.field_id = s.field_id
      WHERE s.user_id = ?`,
      [supervisorUserId]
    );

    if (!fields.length) return res.json([]);

    const fieldIds = fields.map(f => f.field_id);
    const cropIds  = [...new Set(fields.map(f => f.crop_id))];

    const [cropTasks] = await db.query(
      `SELECT ct.crop_task_id, ct.crop_id, ct.task_id,
              ct.frequency_days, ct.estimated_man_hours,
              t.task_name, t.description
       FROM crop_tasks ct
       JOIN tasks t ON ct.task_id = t.task_id
       WHERE ct.crop_id IN (?)`,
      [cropIds]
    );

    const [existing] = await db.query(
      `SELECT ta.assignment_id, ta.task_id, ta.field_id,
              ta.worker_id, ta.status, ta.assigned_date,
              ta.expected_hours, ta.actual_hours, ta.remarks,
              u.full_name AS worker_name
       FROM task_assignments ta
       JOIN users u ON ta.worker_id = u.user_id
       WHERE ta.field_id IN (?) AND ta.assigned_date = ?`,
      [fieldIds, date]
    );

    const result = fields.map(field => {
      const fieldCropTasks = cropTasks.filter(ct => ct.crop_id === field.crop_id);
      return {
        field_id:   field.field_id,
        field_name: field.field_name,
        crop_id:    field.crop_id,
        crop_name:  field.crop_name,
        location:   field.location,
        crop_tasks: fieldCropTasks.map(ct => ({
          ...ct,
          assignments: existing.filter(
            a => a.task_id === ct.task_id && a.field_id === field.field_id
          )
        }))
      };
    });

    res.json(result);
  } catch (err) {
    console.error("getTasksForDate:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET /api/assignments/workers?date=2026-01-28&field_id=1
export const getAvailableWorkers = async (req, res) => {
  try {
    const { date, field_id, task_id } = req.query;
    const queryDate = date || new Date().toISOString().split("T")[0];

    let requiredSkills = [];

    if (task_id) {
      const [skillRows] = await db.query(
        `SELECT skill_name FROM task_skills WHERE task_id = ?`,
        [task_id]
      );
      requiredSkills = skillRows.map(s =>
        s.skill_name.toLowerCase().trim()
      );
    }

    const [workers] = await db.query(
      `SELECT w.worker_id, w.user_id, w.skills,
              w.preferred_locations, w.max_daily_hours,
              u.full_name, u.phone,
              COALESCE(wa.status, 'available') AS availability_status
       FROM workers w
       JOIN users u ON w.user_id = u.user_id
       LEFT JOIN worker_availability wa
         ON wa.worker_id = w.worker_id AND wa.date = ?
       WHERE u.status = 'ACTIVE'
         AND u.role_id = 3`,
      [queryDate]
    );

    const parse = (d) => {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      try { return JSON.parse(d); } catch { return []; }
    };

    let parsed = workers.map(w => ({
      ...w,
      skills: parse(w.skills).map(s => s.toLowerCase().trim()),
      preferred_locations: parse(w.preferred_locations).map(Number)
    }));

    const [hoursUsed] = await db.query(
      `SELECT worker_id, SUM(expected_hours) AS used
       FROM task_assignments
       WHERE assigned_date = ? AND status != 'rejected'
       GROUP BY worker_id`,
      [queryDate]
    );

    const hoursMap = {};
    hoursUsed.forEach(h => {
      hoursMap[h.worker_id] = Number(h.used);
    });

    let filtered = parsed.filter(w => {
      const used = hoursMap[w.worker_id] || 0;
      const remaining = w.max_daily_hours - used;

      if (w.availability_status !== "available") return false;
      if (remaining <= 0) return false;

      if (field_id) {
        const fid = Number(field_id);
        if (
          w.preferred_locations.length &&
          !w.preferred_locations.includes(fid)
        ) return false;
      }

      if (requiredSkills.length) {
        const ok = requiredSkills.some(s =>
          w.skills.includes(s)
        );
        if (!ok) return false;
      }

      return true;
    });

    res.json(
      filtered.map(w => ({
        ...w,
        hours_used: hoursMap[w.worker_id] || 0,
        hours_remaining: w.max_daily_hours - (hoursMap[w.worker_id] || 0)
      }))
    );
  } catch (err) {
    console.error("getAvailableWorkers:", err);
    res.status(500).json({ error: "Database error" });
  }
};
// POST /api/assignments
export const createAssignment = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      task_id,
      field_id,
      worker_user_id, // this is USERS.user_id
      assigned_date,
      expected_hours,
      remarks
    } = req.body;

    console.log("createAssignment body:", req.body);

    if (!task_id || !field_id || !worker_user_id || !assigned_date) {
      return res.status(400).json({
        error: "task_id, field_id, worker_user_id, assigned_date required"
      });
    }

    // 🔥 FIX 1: Convert user_id → worker_id
    const [workerRow] = await db.query(
      `SELECT worker_id FROM workers WHERE user_id = ?`,
      [worker_user_id]
    );

    if (!workerRow.length) {
      return res.status(400).json({
        error: "Worker profile not found for this user"
      });
    }

    const workerId = workerRow[0].worker_id;

    // 🔥 FIX 2: Insert using worker_id (NOT user_id)
    const [result] = await db.query(
      `INSERT INTO task_assignments
       (task_id, field_id, worker_id, assigned_by, status, assigned_date, expected_hours, remarks)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        task_id,
        field_id,
        workerId,
        supervisorUserId,
        assigned_date,
        expected_hours || null,
        remarks || null
      ]
    );

    // Worker + task info
    const [workerDetails] = await db.query(
      `SELECT u.full_name, u.email, t.task_name, f.field_name, f.location
       FROM users u
       JOIN tasks t ON t.task_id = ?
       JOIN fields f ON f.field_id = ?
       WHERE u.user_id = ?`,
      [task_id, field_id, worker_user_id]
    );

    if (workerDetails.length) {
      const wd = workerDetails[0];
      const deadlineStr = req.body.deadline_time
        ? ` Deadline: ${req.body.deadline_time}.`
        : "";

      await createNotification(
        worker_user_id,
        `New Task: ${wd.task_name}`,
        `You've been assigned "${wd.task_name}" at ${wd.field_name} on ${assigned_date}.${deadlineStr}`,
        "task_assigned",
        result.insertId
      );

      await sendTaskEmail(
        wd.email,
        wd.full_name,
        `[Plantro] New Task: ${wd.task_name}`,
        `<p>Hi ${wd.full_name}, you've been assigned <strong>${wd.task_name}</strong> at <strong>${wd.field_name}</strong> on ${assigned_date}.</p>`
      );
    }

    const [rows] = await db.query(
      `SELECT ta.*, u.full_name AS worker_name
       FROM task_assignments ta
       JOIN users u ON ta.worker_id = u.user_id
       WHERE ta.assignment_id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("createAssignment:", err);
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/assignments/:id
export const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actual_hours, remarks } = req.body;

    await db.query(
      `UPDATE task_assignments
       SET status       = COALESCE(?, status),
           actual_hours = COALESCE(?, actual_hours),
           remarks      = COALESCE(?, remarks)
       WHERE assignment_id = ?`,
      [status, actual_hours, remarks, id]
    );

    const [rows] = await db.query(
      `SELECT ta.*, u.full_name AS worker_name
       FROM task_assignments ta
       JOIN users u ON ta.worker_id = u.user_id
       WHERE ta.assignment_id = ?`,
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error("updateAssignment:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// DELETE /api/assignments/:id
export const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM task_assignments WHERE assignment_id = ?", [id]);
    res.json({ assignment_id: Number(id) });
  } catch (err) {
    console.error("deleteAssignment:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET /api/assignments/calendar?month=2026-01
export const getCalendarDots = async (req, res) => {
  try {
    const supervisorUserId =
    req.user?.id ?? Number(req.body.assigned_by);

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Supervisor required" });
    }
    const { month } = req.query;

    const [fields] = await db.query(
      `SELECT field_id 
      FROM supervisors 
      WHERE user_id = ?`,
      [supervisorUserId]
    );

    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const startDate = `${month}-01`;
    const endDate   = `${month}-31`;

    const [rows] = await db.query(
      `SELECT assigned_date, COUNT(*) AS task_count
       FROM task_assignments
       WHERE field_id IN (?) AND assigned_date BETWEEN ? AND ?
       GROUP BY assigned_date`,
      [fieldIds, startDate, endDate]
    );

    res.json(rows);
  } catch (err) {
    console.error("getCalendarDots:", err);
    res.status(500).json({ error: "Database error" });
  }
};
export const getAssignmentHistory = async (req, res) => {
  try {
    const supervisorUserId =
    req.user?.id ?? Number(req.body.assigned_by);

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Supervisor required" });
    }
    const days = Number(req.query.days) || 30;
 
    const [fields] = await db.query(
      "SELECT field_id FROM fields WHERE supervisor_id = ?",
      [supervisorUserId]
    );
    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);
 
    const [rows] = await db.query(
      `SELECT
         ta.assignment_id,
         ta.task_id,
         ta.field_id,
         ta.worker_id,
         ta.status,
         ta.assigned_date,
         ta.expected_hours,
         ta.actual_hours,
         ta.completed_at,
         ta.verified_at,
         ta.remarks,
         t.task_name,
         f.field_name,
         f.location,
         c.crop_name,
         u.full_name AS worker_name
       FROM task_assignments ta
       JOIN tasks  t ON ta.task_id  = t.task_id
       JOIN fields f ON ta.field_id = f.field_id
       JOIN crops  c ON f.crop_id   = c.crop_id
       JOIN users  u ON ta.worker_id = u.user_id
       WHERE ta.field_id IN (?)
         AND ta.assigned_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY ta.assigned_date DESC, ta.assignment_id DESC`,
      [fieldIds, days]
    );
 
    res.json(rows);
  } catch (err) {
    console.error("getAssignmentHistory:", err);
    res.status(500).json({ error: "Database error" });
  }
};
import { db } from "../config/db.js";

// ─────────────────────────────────────────────
// GET ALL WORKERS (with user info, skills, availability)
// GET /api/workforce/workers
// ─────────────────────────────────────────────
export const getAllWorkers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         u.user_id,
         u.full_name,
         u.email,
         u.phone,
         u.status,
         u.created_at,
         w.worker_id,
         w.skills,
         w.preferred_locations,
         w.max_daily_hours,
         w.profile_completed,
         r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN workers w ON w.user_id = u.user_id
       WHERE r.role_name IN ('WORKER', 'SUPERVISOR')
       ORDER BY u.created_at DESC`
    );

    const parse = (val) => {
      if (!val) return [];
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return []; }
      }
      return Array.isArray(val) ? val : [];
    };

    // For each worker, get assigned task count and completion rate
    const enriched = await Promise.all(
      rows.map(async (row) => {
        let assignedTasks = 0;
        let completionRate = 0;

        if (row.worker_id) {
          const [taskStats] = await db.query(
            `SELECT
               COUNT(*) AS total,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
             FROM task_assignments
             WHERE worker_id = ?`,
            [row.worker_id]
          );

          assignedTasks = taskStats[0]?.total || 0;
          const completed = taskStats[0]?.completed || 0;
          completionRate =
            assignedTasks > 0
              ? Math.round((completed / assignedTasks) * 100)
              : 0;

          // Get today's availability
          const today = new Date().toISOString().split("T")[0];
          const [avail] = await db.query(
            `SELECT status FROM worker_availability
             WHERE worker_id = ? AND date = ?`,
            [row.worker_id, today]
          );

          row._availabilityStatus =
            avail.length > 0 ? avail[0].status : "available";
        }

        return {
          id: row.worker_id ? `W${String(row.worker_id).padStart(3, "0")}` : null,
          worker_id: row.worker_id,
          user_id: row.user_id,
          name: row.full_name,
          email: row.email,
          phone: row.phone || "",
          role: row.role_name === "SUPERVISOR" ? "Supervisor" : "Worker",
          status: row.status === "ACTIVE" ? "active" : "inactive",
          specialty: parse(row.skills),
          location:
            parse(row.preferred_locations)[0] || "Not specified",
          joinDate: row.created_at
            ? new Date(row.created_at).toISOString().split("T")[0]
            : null,
          manHoursPerDay: row.max_daily_hours || 8,
          assignedTasks,
          completionRate,
          availability:
            row._availabilityStatus === "available"
              ? "Available"
              : "Not Available",
        };
      })
    );

    return res.json({ success: true, workers: enriched });
  } catch (error) {
    console.error("getAllWorkers error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET SINGLE WORKER
// GET /api/workforce/workers/:userId
// ─────────────────────────────────────────────
export const getWorkerById = async (req, res) => {
  try {
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT
         u.user_id, u.full_name, u.email, u.phone, u.status, u.created_at,
         w.worker_id, w.skills, w.preferred_locations, w.max_daily_hours,
         r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN workers w ON w.user_id = u.user_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "Worker not found." });

    return res.json({ success: true, worker: rows[0] });
  } catch (error) {
    console.error("getWorkerById error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// CREATE / REGISTER NEW WORKER
// POST /api/workforce/workers
// body: { full_name, email, phone, role, location, specialty[], manHoursPerDay }
// ─────────────────────────────────────────────
export const createWorker = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      full_name,
      email,
      phone,
      role = "Worker",
      location,
      specialty = [],
      manHoursPerDay = 8,
    } = req.body;

    if (!full_name || !email) {
      return res
        .status(400)
        .json({ success: false, message: "full_name and email are required." });
    }

    // Check email uniqueness
    const [existing] = await conn.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length) {
      await conn.rollback();
      return res
        .status(409)
        .json({ success: false, message: "Email already registered." });
    }

    // Determine role_id
    const roleName = role === "Supervisor" ? "SUPERVISOR" : "WORKER";
    const [roleRows] = await conn.query(
      "SELECT role_id FROM roles WHERE role_name = ?",
      [roleName]
    );
    if (!roleRows.length) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: "Invalid role." });
    }
    const roleId = roleRows[0].role_id;

    // Default password (should be changed on first login)
    const defaultPassword = "$2b$10$defaultHashedPassword"; // placeholder

    // Insert user
    const [userResult] = await conn.query(
      `INSERT INTO users (role_id, full_name, email, phone, password, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [roleId, full_name, email, phone || null, defaultPassword]
    );
    const newUserId = userResult.insertId;

    // Insert worker profile
    const [workerResult] = await conn.query(
      `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
       VALUES (?, ?, ?, ?, 1)`,
      [
        newUserId,
        JSON.stringify(specialty),
        JSON.stringify(location ? [location] : []),
        parseInt(manHoursPerDay) || 8,
      ]
    );

    await conn.commit();

    return res.status(201).json({
      success: true,
      message: "Worker registered successfully.",
      worker: {
        user_id: newUserId,
        worker_id: workerResult.insertId,
        full_name,
        email,
        phone,
        role: roleName,
        skills: specialty,
        preferred_locations: location ? [location] : [],
        max_daily_hours: parseInt(manHoursPerDay) || 8,
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error("createWorker error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────
// UPDATE WORKER
// PUT /api/workforce/workers/:userId
// body: { full_name, email, phone, role, location, specialty[], manHoursPerDay }
// ─────────────────────────────────────────────
export const updateWorker = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { userId } = req.params;
    const {
      full_name,
      email,
      phone,
      role,
      location,
      specialty = [],
      manHoursPerDay = 8,
    } = req.body;

    // Update user table
    await conn.query(
      "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE user_id = ?",
      [full_name, email, phone || null, userId]
    );

    // Update role if provided
    if (role) {
      const roleName = role === "Supervisor" ? "SUPERVISOR" : "WORKER";
      const [roleRows] = await conn.query(
        "SELECT role_id FROM roles WHERE role_name = ?",
        [roleName]
      );
      if (roleRows.length) {
        await conn.query(
          "UPDATE users SET role_id = ? WHERE user_id = ?",
          [roleRows[0].role_id, userId]
        );
      }
    }

    // Update worker profile
    const [workerRows] = await conn.query(
      "SELECT worker_id FROM workers WHERE user_id = ?",
      [userId]
    );

    if (workerRows.length) {
      await conn.query(
        `UPDATE workers
         SET skills = ?, preferred_locations = ?, max_daily_hours = ?
         WHERE user_id = ?`,
        [
          JSON.stringify(specialty),
          JSON.stringify(location ? [location] : []),
          parseInt(manHoursPerDay) || 8,
          userId,
        ]
      );
    } else {
      // Create worker profile if missing
      await conn.query(
        `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
         VALUES (?, ?, ?, ?, 1)`,
        [
          userId,
          JSON.stringify(specialty),
          JSON.stringify(location ? [location] : []),
          parseInt(manHoursPerDay) || 8,
        ]
      );
    }

    await conn.commit();
    return res.json({ success: true, message: "Worker updated successfully." });
  } catch (error) {
    await conn.rollback();
    console.error("updateWorker error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    conn.release();
  }
};

// ─────────────────────────────────────────────
// DELETE (DEACTIVATE) WORKER
// DELETE /api/workforce/workers/:userId
// ─────────────────────────────────────────────
export const deleteWorker = async (req, res) => {
  try {
    const { userId } = req.params;

    // Soft delete: set status to INACTIVE
    await db.query(
      "UPDATE users SET status = 'INACTIVE' WHERE user_id = ?",
      [userId]
    );

    return res.json({ success: true, message: "Worker deactivated." });
  } catch (error) {
    console.error("deleteWorker error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// TOGGLE WORKER STATUS (active/inactive)
// PUT /api/workforce/workers/:userId/status
// body: { status: 'ACTIVE' | 'INACTIVE' }
// ─────────────────────────────────────────────
export const toggleWorkerStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    await db.query("UPDATE users SET status = ? WHERE user_id = ?", [
      status,
      userId,
    ]);

    return res.json({ success: true, message: `Worker ${status.toLowerCase()}.` });
  } catch (error) {
    console.error("toggleWorkerStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// TOGGLE AVAILABILITY FOR TODAY
// PUT /api/workforce/workers/:workerId/availability
// body: { status: 'available' | 'unavailable' }
// ─────────────────────────────────────────────
export const toggleAvailability = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status } = req.body;

    if (!["available", "unavailable"].includes(status)) {
      return res.status(400).json({ message: "Invalid availability status." });
    }

    const today = new Date().toISOString().split("T")[0];

    const [existing] = await db.query(
      "SELECT availability_id FROM worker_availability WHERE worker_id = ? AND date = ?",
      [workerId, today]
    );

    if (existing.length) {
      await db.query(
        "UPDATE worker_availability SET status = ? WHERE worker_id = ? AND date = ?",
        [status, workerId, today]
      );
    } else {
      await db.query(
        "INSERT INTO worker_availability (worker_id, date, available_hours, status) VALUES (?, ?, 8, ?)",
        [workerId, today, status]
      );
    }

    return res.json({ success: true, availability: status });
  } catch (error) {
    console.error("toggleAvailability error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// ASSIGN TASK TO WORKER
// POST /api/workforce/assign-task
// body: { worker_id, task_name, field_id, hoursRequired, dueDate, priority, assigned_by }
// ─────────────────────────────────────────────
export const assignTask = async (req, res) => {
  try {
    const {
      worker_id,
      task_id,
      field_id,
      hoursRequired,
      dueDate,
      remarks,
      assigned_by,
    } = req.body;

    if (!worker_id || !task_id || !field_id || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "worker_id, task_id, field_id, dueDate are required.",
      });
    }

    await db.query(
      `INSERT INTO task_assignments
         (task_id, field_id, worker_id, assigned_by, status, assigned_date, expected_hours, remarks)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        task_id,
        field_id,
        worker_id,
        assigned_by || null,
        dueDate,
        parseInt(hoursRequired) || null,
        remarks || null,
      ]
    );

    return res.json({ success: true, message: "Task assigned successfully." });
  } catch (error) {
    console.error("assignTask error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL TASKS (for dropdown in assign modal)
// GET /api/workforce/tasks
// ─────────────────────────────────────────────
export const getAllTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(
      "SELECT task_id, task_name, description FROM tasks ORDER BY task_name"
    );
    return res.json({ success: true, tasks });
  } catch (error) {
    console.error("getAllTasks error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET ALL FIELDS (for dropdown in assign modal)
// GET /api/workforce/fields
// ─────────────────────────────────────────────
export const getAllFields = async (req, res) => {
  try {
    const [fields] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, c.crop_name
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       ORDER BY f.field_name`
    );
    return res.json({ success: true, fields });
  } catch (error) {
    console.error("getAllFields error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET WORKER TASK HISTORY
// GET /api/workforce/workers/:workerId/tasks
// ─────────────────────────────────────────────
export const getWorkerTaskHistory = async (req, res) => {
  try {
    const { workerId } = req.params;

    const [tasks] = await db.query(
      `SELECT
         ta.assignment_id,
         ta.assigned_date,
         ta.status,
         ta.expected_hours,
         ta.actual_hours,
         ta.remarks,
         t.task_name,
         f.field_name,
         c.crop_name
       FROM task_assignments ta
       JOIN tasks t   ON ta.task_id  = t.task_id
       JOIN fields f  ON ta.field_id = f.field_id
       JOIN crops c   ON f.crop_id   = c.crop_id
       WHERE ta.worker_id = ?
       ORDER BY ta.assigned_date DESC
       LIMIT 20`,
      [workerId]
    );

    return res.json({ success: true, tasks });
  } catch (error) {
    console.error("getWorkerTaskHistory error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────
// CHANGE WORKER ROLE (Worker ↔ Supervisor)
// PUT /api/workforce/workers/:userId/role
// body: { role: 'Worker' | 'Supervisor' }
// ─────────────────────────────────────────────
export const changeWorkerRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['Worker', 'Supervisor'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'Worker' or 'Supervisor'." });
    }

    const roleName = role === 'Supervisor' ? 'SUPERVISOR' : 'WORKER';

    const [roleRows] = await db.query(
      "SELECT role_id FROM roles WHERE role_name = ?",
      [roleName]
    );

    if (!roleRows.length) {
      return res.status(400).json({ message: "Role not found in database." });
    }

    await db.query(
      "UPDATE users SET role_id = ? WHERE user_id = ?",
      [roleRows[0].role_id, userId]
    );

    // If promoted to Supervisor, ensure a supervisors row exists
    if (role === 'Supervisor') {
      const [existing] = await db.query(
        "SELECT supervisor_id FROM supervisors WHERE user_id = ?",
        [userId]
      );
      if (!existing.length) {
        await db.query(
          "INSERT INTO supervisors (user_id, assigned_fields) VALUES (?, ?)",
          [userId, JSON.stringify([])]
        );
      }
    }

    return res.json({ success: true, message: `Role updated to ${role}.` });
  } catch (error) {
    console.error("changeWorkerRole error:", error);
    res.status(500).json({ message: error.message });
  }
};
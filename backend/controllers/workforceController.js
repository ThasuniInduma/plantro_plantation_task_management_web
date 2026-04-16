import { db } from "../config/db.js";
import bcrypt from "bcrypt";

/* =========================================================
   HELPER: Get Role ID
========================================================= */
const getRoleId = async (conn, roleName) => {
  const [rows] = await conn.query(
    "SELECT role_id FROM roles WHERE role_name = ?",
    [roleName]
  );
  if (!rows.length) throw new Error(`Role '${roleName}' not found`);
  return rows[0].role_id;
};

/* =========================================================
   GET ALL WORKERS + SUPERVISORS
========================================================= */
export const getAllWorkers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        u.status,
        u.created_at,
        r.role_name,
        w.worker_id,
        w.skills,
        w.preferred_locations,
        w.max_daily_hours,
        s.supervisor_id,
        s.field_id AS supervisor_field_id,
        f.field_name AS supervisor_field_name
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN supervisors s ON s.user_id = u.user_id
      LEFT JOIN fields f ON f.field_id = s.field_id
      WHERE r.role_name IN ('WORKER', 'SUPERVISOR')
      ORDER BY u.created_at DESC
    `);

    const parse = (val) => {
      if (!val) return [];
      try { return JSON.parse(val); } catch { return []; }
    };

    const result = await Promise.all(rows.map(async (row) => {
      let assignedTasks = 0;
      let completionRate = 0;
      let availability = "Not Available";

      if (row.worker_id) {
        // Task stats
        const [stats] = await db.query(`
          SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
          FROM task_assignments
          WHERE worker_id = ?
        `, [row.worker_id]);

        assignedTasks = stats[0].total || 0;
        completionRate = assignedTasks > 0
          ? Math.round((stats[0].completed / assignedTasks) * 100)
          : 0;

        // Latest availability
        const [avail] = await db.query(`
          SELECT status FROM worker_availability
          WHERE worker_id = ?
          ORDER BY date DESC, availability_id DESC
          LIMIT 1
        `, [row.worker_id]);

        availability = avail.length > 0 && avail[0].status === "available"
          ? "Available"
          : "Not Available";
      }

      return {
        user_id:            row.user_id,
        worker_id:          row.worker_id   || null,
        supervisor_id:      row.supervisor_id || null,
        name:               row.full_name,
        email:              row.email,
        phone:              row.phone,
        role:               row.role_name === "SUPERVISOR" ? "Supervisor" : "Worker",
        status:             row.status === "ACTIVE" ? "active" : "inactive",
        specialty:          row.skills ? parse(row.skills) : [],
        location:           row.preferred_locations ? parse(row.preferred_locations)[0] : "",
        manHoursPerDay:     row.max_daily_hours || 8,
        assignedTasks,
        completionRate,
        availability,
        joinDate:           row.created_at ? row.created_at.toISOString().split("T")[0] : null,
        supervisorFieldId:  row.supervisor_field_id   || null,
        supervisorFieldName: row.supervisor_field_name || null,
      };
    }));

    res.json({ success: true, workers: result });
  } catch (err) {
    console.error("getAllWorkers error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   CREATE WORKER OR SUPERVISOR
========================================================= */
export const createWorker = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      full_name,
      email,
      phone,
      password,
      role = "Worker",
      location,
      specialty = [],
      manHoursPerDay = 8,
      field_id,            // required for Supervisor
    } = req.body;

    // ── Validation ──────────────────────────────────────────
    if (!full_name || !email || !password) {
      throw new Error("Name, email, and password are required");
    }

    const roleName = role === "Supervisor" ? "SUPERVISOR" : "WORKER";

    if (roleName === "WORKER" && (!location || !specialty.length)) {
      throw new Error("Location and at least one specialty are required for workers");
    }
    if (roleName === "SUPERVISOR" && !field_id) {
      throw new Error("A field assignment is required for supervisors");
    }

    // ── Duplicate email check ────────────────────────────────
    const [exists] = await conn.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    );
    if (exists.length) throw new Error("Email already registered");

    // ── Hash password ────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    const roleId = await getRoleId(conn, roleName);

    // ── Insert into users ────────────────────────────────────
    const [userRes] = await conn.query(
      `INSERT INTO users (role_id, full_name, email, phone, password, status)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
      [roleId, full_name, email, phone || null, hashedPassword]
    );
    const userId = userRes.insertId;

    // ── Role-specific insert ─────────────────────────────────
    if (roleName === "WORKER") {
      await conn.query(
        `INSERT INTO workers
           (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
         VALUES (?, ?, ?, ?, 1)`,
        [
          userId,
          JSON.stringify(specialty),
          JSON.stringify([location]),
          parseInt(manHoursPerDay) || 8,
        ]
      );
    } else {
      // Check if field already has a supervisor
      // Check if field exists
      const [fieldCheck] = await conn.query(
        "SELECT field_id FROM fields WHERE field_id = ?",
        [field_id]
      );

      if (!fieldCheck.length) {
        throw new Error("Selected field does not exist");
      }

      // Check if already assigned
      const [existing] = await conn.query(
        "SELECT * FROM supervisors WHERE field_id = ?",
        [field_id]
      );

      if (existing.length) {
        throw new Error("Field already has a supervisor");
      }

      // Insert supervisor mapping
      await conn.query(
        "INSERT INTO supervisors (user_id, field_id) VALUES (?, ?)",
        [userId, field_id]
      );

    }

    await conn.commit();
    res.json({ success: true, message: `${role} registered successfully` });
  } catch (err) {
    await conn.rollback();
    console.error("createWorker error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* =========================================================
   UPDATE WORKER OR SUPERVISOR  (no password change here)
========================================================= */
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
      specialty,
      manHoursPerDay,
      field_id,
    } = req.body;

    // ── Basic user update ────────────────────────────────────
    await conn.query(
      "UPDATE users SET full_name = ?, email = ?, phone = ? WHERE user_id = ?",
      [full_name, email, phone || null, userId]
    );

    const roleName = role === "Supervisor" ? "SUPERVISOR" : "WORKER";
    const roleId   = await getRoleId(conn, roleName);

    await conn.query(
      "UPDATE users SET role_id = ? WHERE user_id = ?",
      [roleId, userId]
    );

    if (roleName === "WORKER") {
      await conn.query(
        `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           skills               = VALUES(skills),
           preferred_locations  = VALUES(preferred_locations),
           max_daily_hours      = VALUES(max_daily_hours)`,
        [
          userId,
          JSON.stringify(specialty || []),
          JSON.stringify([location]),
          parseInt(manHoursPerDay) || 8,
        ]
      );
    } else {
      // Editing a supervisor — update their field
      if (!field_id) throw new Error("Field is required for Supervisor");

      await conn.query(
        `INSERT INTO supervisors (user_id, field_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE field_id = VALUES(field_id)`,
        [userId, field_id]
      );

    }

    await conn.commit();
    res.json({ success: true, message: "Worker updated successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("updateWorker error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* =========================================================
   DELETE WORKER
========================================================= */
export const deleteWorker = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { userId } = req.params;

    // Remove role-specific rows first (FK constraints)
    await conn.query("DELETE FROM workers     WHERE user_id = ?", [userId]);
    await conn.query("DELETE FROM supervisors WHERE user_id = ?", [userId]);
    await conn.query("DELETE FROM users       WHERE user_id = ?", [userId]);

    await conn.commit();
    res.json({ success: true, message: "Worker removed successfully" });
  } catch (err) {
    await conn.rollback();
    console.error("deleteWorker error:", err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* =========================================================
   UPDATE WORKER ACCOUNT STATUS  (ACTIVE / INACTIVE)
========================================================= */
export const updateWorkerStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body; // "ACTIVE" | "INACTIVE"

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    await db.query(
      "UPDATE users SET status = ? WHERE user_id = ?",
      [status, userId]
    );

    res.json({ success: true, message: `Account ${status.toLowerCase()}d` });
  } catch (err) {
    console.error("updateWorkerStatus error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   PROMOTE WORKER → SUPERVISOR
   - Removes worker row
   - Creates supervisor row
   - Updates role in users table
   - Assigns field
========================================================= */
export const promoteWorkerToSupervisor = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { userId } = req.params;
    const { field_id } = req.body;

    if (!field_id) {
      throw new Error("A field assignment is required when promoting to Supervisor");
    }

    // 1. Validate user is worker
    const [userRows] = await conn.query(
      `SELECT u.user_id, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (!userRows.length) throw new Error("User not found");
    if (userRows[0].role_name !== "WORKER") throw new Error("User is not a Worker");

    // 2. Upgrade role
    const supervisorRoleId = await getRoleId(conn, "SUPERVISOR");

    await conn.query(
      "UPDATE users SET role_id = ? WHERE user_id = ?",
      [supervisorRoleId, userId]
    );

    // 3. Remove worker record
    await conn.query("DELETE FROM workers WHERE user_id = ?", [userId]);

    // 4. Insert supervisor row (OK to keep mapping table)
    await conn.query(
      `INSERT INTO supervisors (user_id, field_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE field_id = VALUES(field_id)`,
      [userId, field_id]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Worker promoted to Supervisor successfully"
    });

  } catch (err) {
    await conn.rollback();
    console.error("promoteWorkerToSupervisor error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
export const demoteSupervisorToWorker = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { userId } = req.params;

    // 1. Check user exists and is supervisor
    const [userRows] = await conn.query(
      `SELECT u.user_id, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [userId]
    );

    if (!userRows.length) throw new Error("User not found");
    if (userRows[0].role_name !== "SUPERVISOR") {
      throw new Error("User is not a Supervisor");
    }


    // 3. Remove supervisor mapping
    await conn.query(
      "DELETE FROM supervisors WHERE user_id = ?",
      [userId]
    );

    // 4. Change role → WORKER
    const workerRoleId = await getRoleId(conn, "WORKER");

    await conn.query(
      "UPDATE users SET role_id = ? WHERE user_id = ?",
      [workerRoleId, userId]
    );

    // 5. Create worker record if not exists
    await conn.query(
      `INSERT INTO workers (user_id, skills, preferred_locations, max_daily_hours, profile_completed)
       VALUES (?, '[]', '[]', 8, 0)
       ON DUPLICATE KEY UPDATE user_id = user_id`,
      [userId]
    );

    await conn.commit();

    res.json({
      success: true,
      message: "Supervisor demoted to Worker successfully"
    });

  } catch (err) {
    await conn.rollback();
    console.error("demoteSupervisorToWorker error:", err);
    res.status(400).json({ message: err.message });
  } finally {
    conn.release();
  }
};
/* =========================================================
   UPDATE SUPERVISOR FIELD ASSIGNMENT
========================================================= */
export const updateSupervisorField = async (req, res) => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { userId } = req.params;
    const { field_id } = req.body;

    if (!field_id) throw new Error("field_id required");

    // Remove old mapping
      await conn.query(
        "DELETE FROM supervisors WHERE user_id = ?",
        [userId]
      );

    // update supervisor mapping
    await conn.query(
      `INSERT INTO supervisors (user_id, field_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE field_id = VALUES(field_id)`,
      [userId, field_id]
    );

    // 🔥 FIXED
    await conn.query(
      "UPDATE fields SET supervisor_id = ? WHERE field_id = ?",
      [userId, field_id]
    );

    await conn.commit();
    res.json({ success: true, message: "Updated" });

  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

/* =========================================================
   UPDATE WORKER AVAILABILITY
========================================================= */
export const updateWorkerAvailability = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status } = req.body; // "available" | "unavailable"

    if (!["available", "unavailable"].includes(status)) {
      return res.status(400).json({ message: "Invalid availability status" });
    }

    const today = new Date().toISOString().split("T")[0];

    // Upsert for today
    await db.query(
      `INSERT INTO worker_availability (worker_id, date, available_hours, status)
       VALUES (?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [workerId, today, status]
    );

    res.json({ success: true, message: `Availability set to ${status}` });
  } catch (err) {
    console.error("updateWorkerAvailability error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   GET WORKER TASK HISTORY  (last 20)
========================================================= */
export const getWorkerTasks = async (req, res) => {
  try {
    const { workerId } = req.params;

    const [rows] = await db.query(`
      SELECT
        ta.assignment_id,
        t.task_name,
        f.field_name,
        c.crop_name,
        ta.status,
        ta.assigned_date,
        ta.actual_hours,
        ta.remarks
      FROM task_assignments ta
      JOIN tasks  t ON t.task_id  = ta.task_id
      JOIN fields f ON f.field_id = ta.field_id
      JOIN crops  c ON c.crop_id  = f.crop_id
      WHERE ta.worker_id = ?
      ORDER BY ta.assigned_date DESC, ta.assignment_id DESC
      LIMIT 20
    `, [workerId]);

    res.json({ success: true, tasks: rows });
  } catch (err) {
    console.error("getWorkerTasks error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   GET ALL TASKS  (for assign-task dropdown)
========================================================= */
export const getAllTasks = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT task_id, task_name, description FROM tasks ORDER BY task_name"
    );
    res.json({ success: true, tasks: rows });
  } catch (err) {
    console.error("getAllTasks error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   GET ALL FIELDS  (for assign-task + supervisor dropdowns)
========================================================= */
export const getAllFields = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.field_id,
        f.field_name,
        f.location,
        c.crop_name,
        s.user_id AS supervisor_id,
        u.full_name AS supervisor_name
      FROM fields f
      JOIN crops c ON c.crop_id = f.crop_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u ON u.user_id = s.user_id
      ORDER BY f.field_name
    `);

    res.json({ success: true, fields: rows });
  } catch (err) {
    console.error("getAllFields error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   GET UNASSIGNED FIELDS  (no supervisor yet)
========================================================= */
export const getUnassignedFields = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        f.field_id,
        f.field_name,
        f.location,
        c.crop_name
      FROM fields f
      JOIN crops c ON c.crop_id = f.crop_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      WHERE s.user_id IS NULL
      ORDER BY f.field_name
    `);
    res.json({ success: true, fields: rows });
  } catch (err) {
    console.error("getUnassignedFields error:", err);
    res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   ASSIGN TASK TO WORKER
========================================================= */
export const assignTask = async (req, res) => {
  try {
    const {
      worker_id,
      task_id,
      field_id,
      hoursRequired,
      dueDate,
      remarks,
    } = req.body;

    if (!worker_id || !task_id || !field_id || !dueDate) {
      return res.status(400).json({ message: "worker_id, task_id, field_id, and dueDate are required" });
    }

    const assignedBy = req.user?.userId || null;

    await db.query(
      `INSERT INTO task_assignments
         (task_id, field_id, worker_id, assigned_by, status, assigned_date, expected_hours, remarks)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        task_id,
        field_id,
        worker_id,
        assignedBy,
        dueDate,
        hoursRequired ? parseInt(hoursRequired) : null,
        remarks || null,
      ]
    );

    res.json({ success: true, message: "Task assigned successfully" });
  } catch (err) {
    console.error("assignTask error:", err);
    res.status(500).json({ message: err.message });
  }
};
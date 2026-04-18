import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/authorize.js";
import { db } from "../config/db.js";

const router = express.Router();

// ─── GET /api/reports/summary ───────────────────────────────────────────────
// Overall stats for dashboard cards
router.get("/summary", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const [taskStats] = await db.query(`
      SELECT
        COUNT(*) AS total_assignments,
        SUM(status = 'completed') AS completed,
        SUM(status = 'pending')   AS pending,
        SUM(status = 'in_progress') AS in_progress,
        SUM(status = 'rejected')  AS rejected
      FROM task_assignments
    `);

    const [workerStats] = await db.query(`
      SELECT COUNT(*) AS total_workers FROM workers w
      JOIN users u ON w.user_id = u.user_id
      WHERE u.status = 'ACTIVE'
    `);

    const [fieldStats] = await db.query(`SELECT COUNT(*) AS total_fields FROM fields`);

    const [verifiedStats] = await db.query(`
      SELECT COUNT(*) AS verified FROM task_assignments
      WHERE verified_by IS NOT NULL
    `);

    const s = taskStats[0];
    const completionRate = s.total_assignments > 0
      ? ((s.completed / s.total_assignments) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      summary: {
        totalAssignments: s.total_assignments,
        completed: s.completed,
        pending: s.pending,
        inProgress: s.in_progress,
        rejected: s.rejected,
        verified: verifiedStats[0].verified,
        completionRate,
        totalWorkers: workerStats[0].total_workers,
        totalFields: fieldStats[0].total_fields,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/task-completion ───────────────────────────────────────
router.get("/task-completion", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const { field_id, start_date, end_date } = req.query;

    let where = "WHERE 1=1";
    const params = [];

    if (field_id && field_id !== "all") {
      where += " AND ta.field_id = ?";
      params.push(field_id);
    }
    if (start_date) {
      where += " AND ta.assigned_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      where += " AND ta.assigned_date <= ?";
      params.push(end_date);
    }

    // For supervisors, restrict to their fields only
    if (req.user.role_name === "supervisor") {
      where += ` AND ta.field_id IN (
        SELECT field_id FROM supervisors WHERE user_id = ?
      )`;
      params.push(req.user.id);
    }

    const [rows] = await db.query(`
      SELECT
        t.task_name,
        f.field_name,
        f.location,
        c.crop_name,
        ta.assigned_date,
        ta.status,
        ta.expected_hours,
        ta.actual_hours,
        ta.deadline_time,
        ta.completed_at,
        ta.verified_at,
        u_worker.full_name AS worker_name,
        u_sup.full_name    AS supervisor_name,
        COUNT(ta.assignment_id) OVER (PARTITION BY ta.field_id, t.task_id, ta.assigned_date) AS total_workers,
        SUM(CASE WHEN ta.status='completed' THEN 1 ELSE 0 END) OVER (PARTITION BY ta.field_id, t.task_id, ta.assigned_date) AS completed_workers
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.task_id
      JOIN fields f ON ta.field_id = f.field_id
      JOIN crops c ON f.crop_id = c.crop_id
      JOIN workers w ON ta.worker_id = w.worker_id
      JOIN users u_worker ON w.user_id = u_worker.user_id
      LEFT JOIN supervisors s ON ta.assigned_by = s.supervisor_id
      LEFT JOIN users u_sup ON s.user_id = u_sup.user_id
      ${where}
      ORDER BY ta.assigned_date DESC, f.field_name, t.task_name
    `, params);

    // Group by task+field+date
    const grouped = {};
    for (const row of rows) {
      const key = `${row.task_name}|${row.field_name}|${row.assigned_date}`;
      if (!grouped[key]) {
        grouped[key] = {
          task_name: row.task_name,
          field_name: row.field_name,
          location: row.location,
          crop_name: row.crop_name,
          assigned_date: row.assigned_date,
          completed_at: row.completed_at,
          verified_at: row.verified_at,
          supervisor_name: row.supervisor_name || "N/A",
          workers: [],
          total_expected_hours: 0,
          total_actual_hours: 0,
          completed_count: 0,
          total_count: 0,
        };
      }
      grouped[key].workers.push({
        name: row.worker_name,
        status: row.status,
        expected_hours: row.expected_hours,
      });
      grouped[key].total_expected_hours += row.expected_hours || 0;
      grouped[key].total_actual_hours += row.actual_hours || 0;
      grouped[key].total_count++;
      if (row.status === "completed") grouped[key].completed_count++;
    }

    const result = Object.values(grouped).map((g) => ({
      ...g,
      completion_rate: g.total_count > 0
        ? ((g.completed_count / g.total_count) * 100).toFixed(1)
        : 0,
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/worker-performance ────────────────────────────────────
router.get("/worker-performance", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const { field_id, start_date, end_date } = req.query;

    let where = "WHERE u.status = 'ACTIVE' AND u.role_id = 3";
    const params = [];

    if (field_id && field_id !== "all") {
      where += " AND ta.field_id = ?";
      params.push(field_id);
    }
    if (start_date) {
      where += " AND ta.assigned_date >= ?";
      params.push(start_date);
    }
    if (end_date) {
      where += " AND ta.assigned_date <= ?";
      params.push(end_date);
    }

    if (req.user.role_name === "supervisor") {
      where += ` AND ta.field_id IN (
        SELECT field_id FROM supervisors WHERE user_id = ?
      )`;
      params.push(req.user.id);
    }

    const [rows] = await db.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        w.skills,
        w.max_daily_hours,
        COUNT(ta.assignment_id)                              AS total_assigned,
        SUM(ta.status = 'completed')                         AS total_completed,
        SUM(ta.status = 'pending')                           AS total_pending,
        SUM(ta.status = 'in_progress')                       AS total_in_progress,
        SUM(ta.verified_by IS NOT NULL)                      AS total_verified,
        COALESCE(SUM(ta.expected_hours), 0)                  AS total_expected_hours,
        COALESCE(SUM(ta.actual_hours), 0)                    AS total_actual_hours,
        MIN(ta.assigned_date)                                AS first_assignment,
        MAX(ta.assigned_date)                                AS last_assignment,
        GROUP_CONCAT(DISTINCT f.field_name ORDER BY f.field_name SEPARATOR ', ') AS fields_worked
      FROM users u
      JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN task_assignments ta ON ta.worker_id = w.worker_id
      LEFT JOIN fields f ON ta.field_id = f.field_id
      ${where}
      GROUP BY u.user_id, u.full_name, u.email, w.skills, w.max_daily_hours
      HAVING total_assigned > 0
      ORDER BY total_completed DESC
    `, params);

    const result = rows.map(r => ({
      ...r,
      skills: (() => { try { return JSON.parse(r.skills || "[]"); } catch { return []; } })(),
      completion_rate: r.total_assigned > 0
        ? ((r.total_completed / r.total_assigned) * 100).toFixed(1)
        : 0,
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/field-status ──────────────────────────────────────────
router.get("/field-status", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    let fieldFilter = "";
    const params = [];

    if (req.user.role_name === "supervisor") {
      fieldFilter = `AND f.field_id IN (
        SELECT field_id FROM supervisors WHERE user_id = ?
      )`;
      params.push(req.user.id);
    }

    const [rows] = await db.query(`
      SELECT
        f.field_id,
        f.field_name,
        f.location,
        f.area,
        c.crop_name,
        u_sup.full_name AS supervisor_name,
        COUNT(DISTINCT fts.schedule_id)                                     AS total_schedules,
        SUM(fts.next_due_date < CURDATE())                                  AS overdue_count,
        COUNT(DISTINCT ta.assignment_id)                                    AS total_assignments,
        SUM(ta.status = 'completed')                                        AS completed_assignments,
        SUM(ta.status = 'pending')                                          AS pending_assignments,
        MAX(ta.assigned_date)                                               AS last_activity_date,
        COUNT(DISTINCT ta.worker_id)                                        AS unique_workers
      FROM fields f
      JOIN crops c ON f.crop_id = c.crop_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u_sup ON s.user_id = u_sup.user_id
      LEFT JOIN field_task_schedule fts ON fts.field_id = f.field_id
      LEFT JOIN task_assignments ta ON ta.field_id = f.field_id
      WHERE 1=1 ${fieldFilter}
      GROUP BY f.field_id, f.field_name, f.location, f.area, c.crop_name, u_sup.full_name
      ORDER BY f.field_name
    `, params);

    const result = rows.map(r => ({
      ...r,
      completion_rate: r.total_assignments > 0
        ? ((r.completed_assignments / r.total_assignments) * 100).toFixed(1)
        : 0,
      health: r.overdue_count > 3 ? "Poor"
        : r.overdue_count > 1 ? "Fair"
        : r.overdue_count > 0 ? "Good"
        : "Excellent",
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/fields-list ───────────────────────────────────────────
// For filter dropdown
router.get("/fields-list", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    let query = "SELECT field_id, field_name FROM fields";
    const params = [];

    if (req.user.role_name === "supervisor") {
      query += " WHERE field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)";
      params.push(req.user.id);
    }

    const [fields] = await db.query(query, params);
    res.json({ success: true, fields });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
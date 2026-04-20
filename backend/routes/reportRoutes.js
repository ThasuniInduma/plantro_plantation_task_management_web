import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/authorize.js";
import { db } from "../config/db.js";

const router = express.Router();

// field filter based on role 
const getFieldFilter = (user, alias = "ta") => {
  if (user.role_name === "supervisor") {
    return { clause: `AND ${alias}.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)`, param: user.id };
  }
  return { clause: "", param: null };
};

//get report summary
router.get("/summary", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user);
    const params = ff.param ? [ff.param] : [];

    const [taskStats] = await db.query(`
      SELECT
        COUNT(*)                              AS total_assignments,
        SUM(status = 'completed')             AS completed,
        SUM(status = 'pending')               AS pending,
        SUM(status = 'in_progress')           AS in_progress,
        SUM(status = 'rejected')              AS rejected,
        SUM(verified_by IS NOT NULL)          AS verified,
        COALESCE(SUM(expected_hours), 0)      AS total_hours
      FROM task_assignments ta
      WHERE 1=1 ${ff.clause}
    `, params);

    const [workerStats] = await db.query(`
      SELECT COUNT(DISTINCT w.worker_id) AS total_workers
      FROM workers w
      JOIN users u ON w.user_id = u.user_id
      WHERE u.status = 'ACTIVE'
    `);

    const [fieldStats] = await db.query(
      req.user.role_name === "supervisor"
        ? `SELECT COUNT(*) AS total_fields FROM supervisors WHERE user_id = ?`
        : `SELECT COUNT(*) AS total_fields FROM fields`,
      req.user.role_name === "supervisor" ? [req.user.id] : []
    );

    // Overdue tasks
    const overdueParms = ff.param ? [ff.param] : [];
    const [overdueStats] = await db.query(`
      SELECT COUNT(*) AS overdue_count
      FROM field_task_schedule fts
      WHERE fts.next_due_date < CURDATE()
        AND fts.pending_verification = 0
        AND fts.is_dismissed = 0
        ${ff.param ? `AND fts.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
    `, overdueParms);

    // Today's tasks
    const todayParams = ff.param ? [ff.param] : [];
    const [todayStats] = await db.query(`
      SELECT COUNT(*) AS today_assignments
      FROM task_assignments ta
      WHERE DATE(ta.assigned_date) = CURDATE()
        ${ff.clause}
    `, todayParams);

    // This week completed
    const weekParams = ff.param ? [ff.param] : [];
    const [weekStats] = await db.query(`
      SELECT COUNT(*) AS week_completed
      FROM task_assignments ta
      WHERE ta.status = 'completed'
        AND ta.assigned_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ${ff.clause}
    `, weekParams);

    const s = taskStats[0];
    const completionRate = s.total_assignments > 0
      ? ((s.completed / s.total_assignments) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      summary: {
        totalAssignments: Number(s.total_assignments),
        completed: Number(s.completed),
        pending: Number(s.pending),
        inProgress: Number(s.in_progress),
        rejected: Number(s.rejected),
        verified: Number(s.verified),
        completionRate: Number(completionRate),
        totalHours: Number(s.total_hours),
        totalWorkers: Number(workerStats[0].total_workers),
        totalFields: Number(fieldStats[0].total_fields),
        overdueCount: Number(overdueStats[0].overdue_count),
        todayAssignments: Number(todayStats[0].today_assignments),
        weekCompleted: Number(weekStats[0].week_completed),
      }
    });
  } catch (err) {
    console.error("summary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// get task completion status
router.get("/task-completion", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const { field_id, start_date, end_date } = req.query;
    const ff = getFieldFilter(req.user);

    let where = "WHERE 1=1";
    const params = [];

    if (field_id && field_id !== "all") { where += " AND ta.field_id = ?"; params.push(field_id); }
    if (start_date) { where += " AND ta.assigned_date >= ?"; params.push(start_date); }
    if (end_date) { where += " AND ta.assigned_date <= ?"; params.push(end_date); }
    if (ff.param) { where += ` AND ta.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)`; params.push(ff.param); }

    const [rows] = await db.query(`
      SELECT
        t.task_id,
        t.task_name,
        f.field_id,
        f.field_name,
        f.location,
        c.crop_name,
        ta.assigned_date,
        ta.status,
        ta.expected_hours,
        ta.completed_at,
        ta.verified_at,
        ta.deadline_time,
        ta.remarks,
        u_worker.full_name AS worker_name,
        u_sup.full_name    AS supervisor_name,
        ta.assignment_id
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.task_id
      JOIN fields f ON ta.field_id = f.field_id
      JOIN crops c ON f.crop_id = c.crop_id
      JOIN workers w ON ta.worker_id = w.worker_id
      JOIN users u_worker ON w.user_id = u_worker.user_id
      LEFT JOIN users u_sup ON ta.assigned_by = u_sup.user_id
      ${where}
      ORDER BY ta.assigned_date DESC, f.field_name, t.task_name
    `, params);

    // Group by task+field+date
    const grouped = {};
    for (const row of rows) {
      const key = `${row.task_id}|${row.field_id}|${String(row.assigned_date).split('T')[0]}`;
      if (!grouped[key]) {
        grouped[key] = {
          task_name: row.task_name,
          field_name: row.field_name,
          location: row.location,
          crop_name: row.crop_name,
          assigned_date: row.assigned_date,
          supervisor_name: row.supervisor_name || "N/A",
          deadline_time: row.deadline_time,
          workers: [],
          total_expected_hours: 0,
          completed_count: 0,
          total_count: 0,
          completed_at: null,
          verified_at: null,
          rejected_count: 0,
        };
      }
      const g = grouped[key];
      g.workers.push({ name: row.worker_name, status: row.status, expected_hours: row.expected_hours, remarks: row.remarks });
      g.total_expected_hours += Number(row.expected_hours || 0);
      g.total_count++;
      if (row.status === "completed") { g.completed_count++; if (row.completed_at) g.completed_at = row.completed_at; }
      if (row.status === "rejected") g.rejected_count++;
      if (row.verified_at) g.verified_at = row.verified_at;
    }

    const result = Object.values(grouped).map(g => ({
      ...g,
      total_expected_hours: Number(g.total_expected_hours.toFixed(1)),
      completion_rate: g.total_count > 0 ? Number(((g.completed_count / g.total_count) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error("task-completion error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// get worker performance
router.get("/worker-performance", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const { field_id, start_date, end_date } = req.query;
    const ff = getFieldFilter(req.user);

    let where = "WHERE u.status = 'ACTIVE' AND u.role_id = 3";
    const params = [];

    if (field_id && field_id !== "all") { where += " AND ta.field_id = ?"; params.push(field_id); }
    if (start_date) { where += " AND ta.assigned_date >= ?"; params.push(start_date); }
    if (end_date) { where += " AND ta.assigned_date <= ?"; params.push(end_date); }
    if (ff.param) { where += ` AND ta.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)`; params.push(ff.param); }

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
        SUM(ta.status = 'rejected')                          AS total_rejected,
        SUM(ta.verified_by IS NOT NULL)                      AS total_verified,
        COALESCE(SUM(ta.expected_hours), 0)                  AS total_expected_hours,
        MIN(ta.assigned_date)                                AS first_assignment,
        MAX(ta.assigned_date)                                AS last_assignment,
        GROUP_CONCAT(DISTINCT f.field_name ORDER BY f.field_name SEPARATOR ', ') AS fields_worked,
        COUNT(DISTINCT ta.assigned_date)                     AS days_worked
      FROM users u
      JOIN workers w ON w.user_id = u.user_id
      LEFT JOIN task_assignments ta ON ta.worker_id = w.worker_id
      LEFT JOIN fields f ON ta.field_id = f.field_id
      ${where}
      GROUP BY u.user_id, u.full_name, u.email, w.skills, w.max_daily_hours
      HAVING total_assigned > 0
      ORDER BY total_completed DESC, total_assigned DESC
    `, params);

    const result = rows.map(r => ({
      ...r,
      skills: (() => { try { return JSON.parse(r.skills || "[]"); } catch { return []; } })(),
      total_assigned: Number(r.total_assigned),
      total_completed: Number(r.total_completed),
      total_pending: Number(r.total_pending),
      total_in_progress: Number(r.total_in_progress),
      total_rejected: Number(r.total_rejected),
      total_verified: Number(r.total_verified),
      total_expected_hours: Number(r.total_expected_hours),
      days_worked: Number(r.days_worked),
      completion_rate: r.total_assigned > 0
        ? Number(((r.total_completed / r.total_assigned) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error("worker-performance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// get field status
router.get("/field-status", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user, "f");
    const params = ff.param ? [ff.param] : [];

    const [rows] = await db.query(`
      SELECT
        f.field_id,
        f.field_name,
        f.location,
        f.area,
        c.crop_name,
        u_sup.full_name                                                     AS supervisor_name,
        COUNT(DISTINCT fts.schedule_id)                                     AS total_schedules,
        SUM(fts.next_due_date < CURDATE() AND fts.is_dismissed = 0)         AS overdue_count,
        SUM(fts.pending_verification = 1)                                   AS pending_verification_count,
        COUNT(DISTINCT ta.assignment_id)                                    AS total_assignments,
        COALESCE(SUM(ta.status = 'completed'), 0)                           AS completed_assignments,
        COALESCE(SUM(ta.status = 'pending'), 0)                             AS pending_assignments,
        COALESCE(SUM(ta.status = 'in_progress'), 0)                         AS inprogress_assignments,
        COALESCE(SUM(ta.status = 'rejected'), 0)                            AS rejected_assignments,
        MAX(ta.assigned_date)                                               AS last_activity_date,
        COUNT(DISTINCT ta.worker_id)                                        AS unique_workers,
        COALESCE(SUM(ta.expected_hours), 0)                                 AS total_hours_assigned
      FROM fields f
      JOIN crops c ON f.crop_id = c.crop_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u_sup ON s.user_id = u_sup.user_id
      LEFT JOIN field_task_schedule fts ON fts.field_id = f.field_id
      LEFT JOIN task_assignments ta ON ta.field_id = f.field_id
      WHERE 1=1 ${ff.param ? `AND f.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
      GROUP BY f.field_id, f.field_name, f.location, f.area, c.crop_name, u_sup.full_name
      ORDER BY f.field_name
    `, params);

    const result = rows.map(r => ({
      ...r,
      overdue_count: Number(r.overdue_count || 0),
      total_assignments: Number(r.total_assignments),
      completed_assignments: Number(r.completed_assignments),
      pending_assignments: Number(r.pending_assignments),
      inprogress_assignments: Number(r.inprogress_assignments),
      rejected_assignments: Number(r.rejected_assignments),
      unique_workers: Number(r.unique_workers),
      total_hours_assigned: Number(r.total_hours_assigned),
      pending_verification_count: Number(r.pending_verification_count || 0),
      completion_rate: r.total_assignments > 0
        ? Number(((r.completed_assignments / r.total_assignments) * 100).toFixed(1)) : 0,
      health: r.overdue_count > 5 ? "Critical"
        : r.overdue_count > 3 ? "Poor"
        : r.overdue_count > 1 ? "Fair"
        : r.overdue_count > 0 ? "Good"
        : "Excellent",
    }));

    res.json({ success: true, reports: result });
  } catch (err) {
    console.error("field-status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// task status distribution, daily trend, top workers, field comparison
router.get("/analytics", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user);
    const params = ff.param ? [ff.param] : [];
    const params2 = ff.param ? [ff.param] : [];
    const params3 = ff.param ? [ff.param] : [];
    const params4 = ff.param ? [ff.param] : [];
    const params5 = ff.param ? [ff.param] : [];

    // Status distribution 
    const [statusDist] = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM task_assignments ta
      WHERE 1=1 ${ff.clause}
      GROUP BY status
    `, params);

    //  Daily task trend — last 14 days
    const [dailyTrend] = await db.query(`
      SELECT
        DATE(assigned_date) AS date,
        COUNT(*) AS total,
        SUM(status='completed') AS completed,
        SUM(status='pending') AS pending
      FROM task_assignments ta
      WHERE assigned_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        ${ff.clause}
      GROUP BY DATE(assigned_date)
      ORDER BY date ASC
    `, params2);

    //  Top 5 workers by completion
    const [topWorkers] = await db.query(`
      SELECT
        u.full_name,
        COUNT(ta.assignment_id) AS total,
        SUM(ta.status='completed') AS completed,
        COALESCE(SUM(ta.expected_hours),0) AS hours
      FROM task_assignments ta
      JOIN workers w ON ta.worker_id = w.worker_id
      JOIN users u ON w.user_id = u.user_id
      WHERE 1=1 ${ff.clause}
      GROUP BY u.user_id, u.full_name
      HAVING total > 0
      ORDER BY completed DESC, total DESC
      LIMIT 5
    `, params3);

    // Field comparison (bar chart)
    const [fieldComparison] = await db.query(`
      SELECT
        f.field_name,
        COUNT(ta.assignment_id) AS total,
        SUM(ta.status='completed') AS completed,
        SUM(fts.next_due_date < CURDATE() AND fts.is_dismissed=0) AS overdue
      FROM fields f
      LEFT JOIN task_assignments ta ON ta.field_id = f.field_id
      LEFT JOIN field_task_schedule fts ON fts.field_id = f.field_id
      ${ff.param ? `WHERE f.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
      GROUP BY f.field_id, f.field_name
      ORDER BY total DESC
    `, params4);

    // Task type breakdown
    const [taskBreakdown] = await db.query(`
      SELECT
        t.task_name,
        COUNT(ta.assignment_id) AS total,
        SUM(ta.status='completed') AS completed,
        COALESCE(SUM(ta.expected_hours),0) AS total_hours
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.task_id
      WHERE 1=1 ${ff.clause}
      GROUP BY t.task_id, t.task_name
      ORDER BY total DESC
    `, params5);

    // Weekly summary for current week vs last week
    const [weeklyComp] = await db.query(`
      SELECT
        CASE
          WHEN assigned_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 'this_week'
          ELSE 'last_week'
        END AS week_label,
        COUNT(*) AS total,
        SUM(status='completed') AS completed
      FROM task_assignments ta
      WHERE assigned_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        ${ff.clause}
      GROUP BY week_label
    `, ff.param ? [ff.param] : []);

    res.json({
      success: true,
      analytics: {
        statusDistribution: statusDist,
        dailyTrend: dailyTrend.map(r => ({
          ...r,
          date: String(r.date).split('T')[0],
          total: Number(r.total),
          completed: Number(r.completed),
          pending: Number(r.pending),
        })),
        topWorkers: topWorkers.map(r => ({
          ...r,
          total: Number(r.total),
          completed: Number(r.completed),
          hours: Number(r.hours),
          rate: r.total > 0 ? Number(((r.completed / r.total) * 100).toFixed(1)) : 0,
        })),
        fieldComparison: fieldComparison.map(r => ({
          ...r,
          total: Number(r.total),
          completed: Number(r.completed),
          overdue: Number(r.overdue),
        })),
        taskBreakdown: taskBreakdown.map(r => ({
          ...r,
          total: Number(r.total),
          completed: Number(r.completed),
          total_hours: Number(r.total_hours),
        })),
        weeklyComparison: weeklyComp,
      }
    });
  } catch (err) {
    console.error("analytics error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// reports of overdue tasks
router.get("/overdue", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user, "fts");
    const params = ff.param ? [ff.param] : [];

    const [rows] = await db.query(`
      SELECT
        fts.schedule_id,
        fts.field_id,
        fts.next_due_date,
        fts.last_done_date,
        DATEDIFF(CURDATE(), fts.next_due_date) AS days_overdue,
        t.task_name,
        f.field_name,
        f.location,
        c.crop_name,
        ct.estimated_man_hours,
        ct.frequency_days,
        u_sup.full_name AS supervisor_name
      FROM field_task_schedule fts
      JOIN tasks t ON fts.task_id = t.task_id
      JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
      JOIN fields f ON fts.field_id = f.field_id
      JOIN crops c ON f.crop_id = c.crop_id
      LEFT JOIN supervisors s ON s.field_id = f.field_id
      LEFT JOIN users u_sup ON s.user_id = u_sup.user_id
      WHERE fts.next_due_date < CURDATE()
        AND fts.pending_verification = 0
        AND fts.is_dismissed = 0
        ${ff.param ? `AND fts.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
      ORDER BY days_overdue DESC
    `, params);

    res.json({ success: true, reports: rows });
  } catch (err) {
    console.error("overdue error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// fields list report
router.get("/fields-list", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    let query = "SELECT field_id, field_name FROM fields ORDER BY field_name";
    const params = [];
    if (req.user.role_name === "supervisor") {
      query = "SELECT field_id, field_name FROM fields WHERE field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?) ORDER BY field_name";
      params.push(req.user.id);
    }
    const [fields] = await db.query(query, params);
    res.json({ success: true, fields });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// incidents reports
router.get("/incident-reports", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user, "ir");
    const params = ff.param ? [ff.param] : [];

    const [rows] = await db.query(`
      SELECT
        ir.report_id,
        ir.title,
        ir.description,
        ir.incident_type,
        ir.severity,
        ir.status,
        ir.created_at AS reported_at,
        ir.updated_at,
        COALESCE(f.field_name, 'Unknown Field') AS field_name,
        COALESCE(u.full_name, 'Unknown User')   AS reported_by,
        COALESCE(u_sup.full_name, 'N/A')        AS supervisor_name
      FROM incident_reports ir
      LEFT JOIN fields f ON f.field_id = ir.field_id
      LEFT JOIN users u ON u.user_id = ir.reporter_id
      LEFT JOIN users u_sup ON u_sup.user_id = ir.supervisor_id
      ${ff.param ? `WHERE ir.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
      ORDER BY ir.created_at DESC
    `, params);

    res.json({ success: true, reports: rows });
  } catch (err) {
    console.error("incident-reports error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// harvesting reports
router.get("/harvesting-reports", authenticate, authorize("OWNER", "SUPERVISOR"), async (req, res) => {
  try {
    const ff = getFieldFilter(req.user, "hr");
    const params = ff.param ? [ff.param] : [];

    const [rows] = await db.query(`
      SELECT
        hr.harvest_id,
        hr.field_id,
        f.field_name,
        c.crop_name,
        hr.harvest_date,
        hr.quantity,
        hr.unit,
        u.full_name AS supervisor_name
      FROM harvest_reports hr
      JOIN fields f ON f.field_id = hr.field_id
      JOIN crops c ON c.crop_id = hr.crop_id
      LEFT JOIN users u ON u.user_id = hr.supervisor_id
      ${ff.param ? `WHERE hr.field_id IN (SELECT field_id FROM supervisors WHERE user_id = ?)` : ""}
      ORDER BY hr.harvest_date DESC
    `, params);

    res.json({ success: true, reports: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
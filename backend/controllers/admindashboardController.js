import { db } from "../config/db.js";

// GET DASHBOARD OVERVIEW STATS
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Total fields
    const [[{ totalFields }]] = await db.query(
      "SELECT COUNT(*) AS totalFields FROM fields"
    );

    // Total active workers
    const [[{ totalWorkers }]] = await db.query(
      `SELECT COUNT(*) AS totalWorkers
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE r.role_name = 'WORKER' AND u.status = 'ACTIVE'`
    );

    // Tasks completed today
    const [[{ tasksCompletedToday }]] = await db.query(
      `SELECT COUNT(*) AS tasksCompletedToday
       FROM task_assignments
       WHERE status = 'completed' AND assigned_date = ?`,
      [today]
    );

    // Tasks pending today
    const [[{ tasksPending }]] = await db.query(
      `SELECT COUNT(*) AS tasksPending
       FROM task_assignments
       WHERE status IN ('pending', 'in_progress') AND assigned_date = ?`,
      [today]
    );

    // Absent workers today
    const [[{ absentWorkers }]] = await db.query(
      `SELECT COUNT(*) AS absentWorkers
       FROM worker_availability
       WHERE date = ? AND status = 'unavailable'`,
      [today]
    );

    return res.json({
      success: true,
      stats: {
        totalFields,
        totalWorkers,
        tasksCompletedToday,
        tasksPending,
        absentWorkers,
      },
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FIELD ACTIVITY SUMMARY
export const getFieldActivity = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [fields] = await db.query(
      `SELECT
         f.field_id,
         f.field_name,
         f.location,
         f.area,
         c.crop_name,
         u.full_name     AS supervisor_name,
         s.user_id       AS supervisor_user_id
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       LEFT JOIN supervisors s ON f.field_id = s.field_id
       LEFT JOIN users u ON s.user_id = u.user_id
       ORDER BY f.field_name`
    );

    const enriched = await Promise.all(
      fields.map(async (field) => {
        // Today's task assignments for this field
        const [todayTasks] = await db.query(
          `SELECT
             t.task_name,
             ta.status,
             GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR '|||') AS worker_names
           FROM task_assignments ta
           JOIN tasks t   ON ta.task_id   = t.task_id
           JOIN workers w ON ta.worker_id = w.worker_id
           JOIN users u   ON w.user_id    = u.user_id
           WHERE ta.field_id = ? AND ta.assigned_date = ?
           GROUP BY t.task_name, ta.status`,
          [field.field_id, today]
        );

        // Completion rate
        const [[{ total }]] = await db.query(
          `SELECT COUNT(*) AS total FROM task_assignments
           WHERE field_id = ? AND assigned_date = ?`,
          [field.field_id, today]
        );

        const [[{ completed }]] = await db.query(
          `SELECT COUNT(*) AS completed FROM task_assignments
           WHERE field_id = ? AND assigned_date = ? AND status = 'completed'`,
          [field.field_id, today]
        );

        const completionRate =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        // Overdue check
        const [[{ overdue }]] = await db.query(
          `SELECT COUNT(*) AS overdue FROM task_assignments
           WHERE field_id = ? AND assigned_date < ? AND status IN ('pending', 'in_progress')`,
          [field.field_id, today]
        );

        const fieldStatus = overdue > 0 ? "attention" : "active";

        // Next due schedule item
        const [[nextSchedule]] = await db.query(
          `SELECT t.task_name, fts.next_due_date
           FROM field_task_schedule fts
           JOIN tasks t ON fts.task_id = t.task_id
           WHERE fts.field_id = ? AND fts.is_dismissed = 0
           ORDER BY fts.next_due_date ASC
           LIMIT 1`,
          [field.field_id]
        );

        const nextDue = nextSchedule
          ? `${nextSchedule.task_name} (Due ${nextSchedule.next_due_date})`
          : "No upcoming tasks";

        const formattedTasks = todayTasks.map((t) => ({
          task: t.task_name,
          workers: t.worker_names ? t.worker_names.split("|||") : [],
          status: formatTaskStatus(t.status),
        }));

        return {
          id: `F${String(field.field_id).padStart(3, "0")}`,
          field_id: field.field_id,
          name: field.field_name,
          crop: field.crop_name,
          area: field.area ? `${field.area} Acres` : "N/A",
          supervisor: field.supervisor_name
            ? `${field.supervisor_name} (S${String(field.supervisor_user_id).padStart(3, "0")})`
            : "Unassigned",
          tasksToday: formattedTasks,
          nextDue,
          status: fieldStatus,
          completionRate,
        };
      })
    );

    return res.json({ success: true, fields: enriched });
  } catch (error) {
    console.error("getFieldActivity error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await db.query(
      `SELECT notification_id, message, type, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [userId]
    );

    const today = new Date().toISOString().split("T")[0];

    // Live system alerts - overdue tasks per field
    const [overdueFields] = await db.query(
      `SELECT f.field_name, COUNT(*) AS cnt
       FROM task_assignments ta
       JOIN fields f ON ta.field_id = f.field_id
       WHERE ta.assigned_date < ? AND ta.status IN ('pending', 'in_progress')
       GROUP BY f.field_id, f.field_name
       ORDER BY cnt DESC
       LIMIT 3`,
      [today]
    );

    // Live system alerts - tasks completed today
    const [[{ doneToday }]] = await db.query(
      `SELECT COUNT(*) AS doneToday FROM task_assignments
       WHERE assigned_date = ? AND status = 'completed'`,
      [today]
    );

    const systemAlerts = [
      ...overdueFields.map((row, i) => ({
        notification_id: `sys_overdue_${i}`,
        message: `${row.field_name} has ${row.cnt} overdue task${row.cnt > 1 ? "s" : ""}`,
        type: "warning",
        is_read: false,
        created_at: new Date().toISOString(),
        isSystem: true,
      })),
      ...(doneToday > 0
        ? [
            {
              notification_id: "sys_done_today",
              message: `${doneToday} task${doneToday > 1 ? "s" : ""} completed today`,
              type: "success",
              is_read: false,
              created_at: new Date().toISOString(),
              isSystem: true,
            },
          ]
        : []),
    ];

    const dbNotifications = rows.map((n) => ({
      id: n.notification_id,
      type: mapNotificationType(n.type),
      message: n.message,
      time: timeAgo(new Date(n.created_at)),
      unread: !n.is_read,
    }));

    const allNotifications = [
      ...systemAlerts.map((n) => ({
        id: n.notification_id,
        type: n.type,
        message: n.message,
        time: "Just now",
        unread: true,
      })),
      ...dbNotifications,
    ];

    return res.json({ success: true, notifications: allNotifications });
  } catch (error) {
    console.error("getNotifications error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// MARK NOTIFICATIONS AS READ
export const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ?",
      [userId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error("markNotificationsRead error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET FIELD DETAIL
export const getFieldDetail = async (req, res) => {
  try {
    const { fieldId } = req.params;
    const today = new Date().toISOString().split("T")[0];

    const [[field]] = await db.query(
      `SELECT
         f.field_id, f.field_name, f.location, f.area,
         c.crop_name,
         u.full_name AS supervisor_name,
         s.user_id   AS supervisor_user_id
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       LEFT JOIN supervisors s ON f.field_id = s.field_id
       LEFT JOIN users u ON s.user_id = u.user_id
       WHERE f.field_id = ?`,
      [fieldId]
    );

    if (!field) {
      return res.status(404).json({ success: false, message: "Field not found." });
    }

    // Today's tasks
    const [todayTasks] = await db.query(
      `SELECT
         t.task_name,
         ta.status,
         GROUP_CONCAT(u.full_name ORDER BY u.full_name SEPARATOR '|||') AS worker_names
       FROM task_assignments ta
       JOIN tasks t   ON ta.task_id   = t.task_id
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u   ON w.user_id    = u.user_id
       WHERE ta.field_id = ? AND ta.assigned_date = ?
       GROUP BY t.task_name, ta.status`,
      [fieldId, today]
    );

    // Completion rate
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM task_assignments
       WHERE field_id = ? AND assigned_date = ?`,
      [fieldId, today]
    );

    const [[{ completed }]] = await db.query(
      `SELECT COUNT(*) AS completed FROM task_assignments
       WHERE field_id = ? AND assigned_date = ? AND status = 'completed'`,
      [fieldId, today]
    );

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Next due
    const [[nextSchedule]] = await db.query(
      `SELECT t.task_name, fts.next_due_date
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       WHERE fts.field_id = ? AND fts.is_dismissed = 0
       ORDER BY fts.next_due_date ASC
       LIMIT 1`,
      [fieldId]
    );

    // Overdue check
    const [[{ overdue }]] = await db.query(
      `SELECT COUNT(*) AS overdue FROM task_assignments
       WHERE field_id = ? AND assigned_date < ? AND status IN ('pending', 'in_progress')`,
      [fieldId, today]
    );

    return res.json({
      success: true,
      field: {
        id: `F${String(field.field_id).padStart(3, "0")}`,
        field_id: field.field_id,
        name: field.field_name,
        crop: field.crop_name,
        area: field.area ? `${field.area} Acres` : "N/A",
        location: field.location || "",
        supervisor: field.supervisor_name
          ? `${field.supervisor_name} (S${String(field.supervisor_user_id).padStart(3, "0")})`
          : "Unassigned",
        tasksToday: todayTasks.map((t) => ({
          task: t.task_name,
          workers: t.worker_names ? t.worker_names.split("|||") : [],
          status: formatTaskStatus(t.status),
        })),
        nextDue: nextSchedule
          ? `${nextSchedule.task_name} (Due ${nextSchedule.next_due_date})`
          : "No upcoming tasks",
        status: overdue > 0 ? "attention" : "active",
        completionRate,
      },
    });
  } catch (error) {
    console.error("getFieldDetail error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// HELPERS
const formatTaskStatus = (status) => {
  const map = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    rejected: "Rejected",
  };
  return map[status] || "Pending";
};

const mapNotificationType = (dbType) => {
  const map = {
    task: "info",
    harvest: "success",
    alert: "warning",
  };
  return map[dbType] || "info";
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min${Math.floor(seconds / 60) > 1 ? "s" : ""} ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? "s" : ""} ago`;
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? "s" : ""} ago`;
};
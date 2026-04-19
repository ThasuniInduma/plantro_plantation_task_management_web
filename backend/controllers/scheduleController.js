import { db } from "../config/db.js";
import { createNotification, sendTaskEmail } from "./notificationController.js";

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── GET /api/schedule/today
export const getTodaySchedule = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Unauthorized" });
    const today = getLocalDate();

    const [fields] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area, c.crop_id, c.crop_name
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       JOIN supervisors s ON f.field_id = s.field_id
       WHERE s.user_id = ?`,
      [supervisorUserId]
    );
    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const [dueTasks] = await db.query(
      `SELECT fts.schedule_id, fts.field_id, fts.task_id, fts.crop_task_id,
              fts.last_done_date, fts.next_due_date, fts.is_dismissed,
              fts.pending_verification, fts.pending_assignment_id,
              t.task_name, t.description,
              ct.frequency_days, ct.estimated_man_hours,
              DATEDIFF(CURDATE(), fts.next_due_date) AS days_overdue
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       WHERE fts.field_id IN (?)
         AND (fts.next_due_date <= CURDATE() OR fts.pending_verification = 1)
         AND fts.is_dismissed = 0`,
      [fieldIds]
    );
    if (!dueTasks.length) return res.json([]);

    const [assignments] = await db.query(
      `SELECT ta.assignment_id, ta.task_id, ta.field_id, ta.worker_id,
              ta.status, ta.expected_hours, ta.completed_at, ta.verified_at,
              ta.deadline_time, u.full_name AS worker_name, u.user_id AS worker_user_id
       FROM task_assignments ta
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.field_id IN (?)
         AND (DATE(ta.assigned_date) = ? OR ta.status IN ('completed','in_progress'))
         AND ta.status != 'rejected'`,
      [fieldIds, today]
    );

    const result = fields.map(field => {
      const fieldTasks = dueTasks.filter(t => t.field_id === field.field_id);
      if (!fieldTasks.length) return null;
      return {
        ...field,
        due_tasks: fieldTasks.map(task => {
          const taskAssignments = assignments.filter(
            a => a.task_id === task.task_id && a.field_id === task.field_id
          );
          const totalAssigned = taskAssignments.reduce((s, a) => s + Number(a.expected_hours || 0), 0);
          return {
            ...task,
            assignments: taskAssignments,
            total_hours_assigned: totalAssigned,
            is_fully_assigned: totalAssigned >= task.estimated_man_hours,
            needs_verification: task.pending_verification === 1
          };
        })
      };
    }).filter(Boolean).filter(f => f.due_tasks.length > 0);

    res.json(result);
  } catch (err) {
    console.error("getTodaySchedule:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET /api/schedule/by-date?date=2024-04-19
export const getScheduleByDate = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Unauthorized" });
    const date = req.query.date;
    if (!date) return res.status(400).json({ error: "Date required" });

    const [fields] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area, c.crop_id, c.crop_name
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       JOIN supervisors s ON f.field_id = s.field_id
       WHERE s.user_id = ?`,
      [supervisorUserId]
    );
    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const [dueTasks] = await db.query(
      `SELECT fts.schedule_id, fts.field_id, fts.task_id, fts.crop_task_id,
              fts.last_done_date, fts.next_due_date, fts.is_dismissed,
              fts.pending_verification, fts.pending_assignment_id,
              t.task_name, t.description,
              ct.frequency_days, ct.estimated_man_hours,
              DATEDIFF(?, fts.next_due_date) AS days_overdue
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       WHERE fts.field_id IN (?)
         AND fts.next_due_date = ?
         AND fts.is_dismissed = 0`,
      [date, fieldIds, date]
    );

    const [assignments] = await db.query(
      `SELECT ta.assignment_id, ta.task_id, ta.field_id, ta.worker_id,
              ta.status, ta.expected_hours, ta.completed_at, ta.verified_at,
              ta.deadline_time, u.full_name AS worker_name, u.user_id AS worker_user_id
       FROM task_assignments ta
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.field_id IN (?)
         AND DATE(ta.assigned_date) = ?
         AND ta.status != 'rejected'`,
      [fieldIds, date]
    );

    const result = fields.map(field => {
      const fieldTasks = dueTasks.filter(t => t.field_id === field.field_id);
      return {
        ...field,
        due_tasks: fieldTasks.map(task => {
          const taskAssignments = assignments.filter(
            a => a.task_id === task.task_id && a.field_id === task.field_id
          );
          const totalAssigned = taskAssignments.reduce((s, a) => s + Number(a.expected_hours || 0), 0);
          return {
            ...task,
            assignments: taskAssignments,
            total_hours_assigned: totalAssigned,
            is_fully_assigned: totalAssigned >= task.estimated_man_hours,
            needs_verification: task.pending_verification === 1
          };
        })
      };
    }).filter(f => f.due_tasks.length > 0);

    res.json(result);
  } catch (err) {
    console.error("getScheduleByDate:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const getUpcomingSchedule = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Unauthorized" });
    const days = Number(req.query.days || 7);

    const [fields] = await db.query(
      `SELECT f.field_id, f.field_name, f.location, f.area, c.crop_id, c.crop_name
       FROM fields f
       JOIN crops c ON f.crop_id = c.crop_id
       JOIN supervisors s ON f.field_id = s.field_id
       WHERE s.user_id = ?`,
      [supervisorUserId]
    );
    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const [rows] = await db.query(
      `SELECT fts.schedule_id, fts.field_id, fts.task_id, fts.next_due_date, fts.last_done_date,
              t.task_name, ct.estimated_man_hours, ct.frequency_days,
              f.field_name, c.crop_name,
              DATEDIFF(fts.next_due_date, CURDATE()) AS days_until_due
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       JOIN fields f ON fts.field_id = f.field_id
       JOIN crops c ON f.crop_id = c.crop_id
       WHERE fts.field_id IN (?)
         AND fts.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         AND fts.is_dismissed = 0
         AND fts.pending_verification = 0
       ORDER BY fts.next_due_date ASC`,
      [fieldIds, days]
    );
    res.json(rows);
  } catch (err) {
    console.error("getUpcomingSchedule:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── POST /api/schedule/assign
export const assignWorkerToScheduledTask = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) {
      return res.status(401).json({ error: "Supervisor required" });
    }

    const {
      schedule_id,
      worker_user_id,
      date,
      deadline_time,
      expected_hours_per_worker
    } = req.body;

    const assignDate = date || getLocalDate();

    // validate supervisor input
    if (!expected_hours_per_worker || expected_hours_per_worker <= 0) {
      return res.status(400).json({
        error: "expected_hours_per_worker is required and must be greater than 0"
      });
    }

    // get schedule
    const [schedRows] = await db.query(
      `SELECT fts.schedule_id, fts.field_id, fts.task_id,
              ct.estimated_man_hours, t.task_name
       FROM field_task_schedule fts
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       JOIN tasks t ON fts.task_id = t.task_id
       WHERE fts.schedule_id = ?`,
      [schedule_id]
    );

    if (!schedRows.length) {
      return res.status(404).json({ error: "Schedule not found" });
    }

    const sched = schedRows[0];

    // verify supervisor field access
    const [supCheck] = await db.query(
      `SELECT supervisor_id FROM supervisors WHERE user_id = ? AND field_id = ?`,
      [supervisorUserId, sched.field_id]
    );

    if (!supCheck.length) {
      return res.status(403).json({ error: "Not your field" });
    }

    // get worker
    const [workerRow] = await db.query(
      `SELECT worker_id, max_daily_hours FROM workers WHERE user_id = ?`,
      [worker_user_id]
    );

    if (!workerRow.length) {
      return res.status(400).json({ error: "Worker profile not found" });
    }

    const workerId = workerRow[0].worker_id;
    const maxHours = workerRow[0].max_daily_hours || 8;

    // check worker location restriction
    const [prefCheck] = await db.query(
      `SELECT preferred_locations FROM workers WHERE worker_id = ?`,
      [workerId]
    );

    if (prefCheck.length) {
      let locs = [];
      try {
        locs = JSON.parse(prefCheck[0].preferred_locations || "[]").map(Number);
      } catch {
        locs = [];
      }

      if (locs.length > 0 && !locs.includes(Number(sched.field_id))) {
        return res.status(400).json({
          error: "Worker is not assigned to this field"
        });
      }
    }

    // check today's used hours
    const [hoursUsedRows] = await db.query(
      `SELECT COALESCE(SUM(expected_hours),0) AS used
       FROM task_assignments
       WHERE worker_id = ? AND assigned_date = ? AND status != 'rejected'`,
      [workerId, assignDate]
    );

    const used = Number(hoursUsedRows[0].used);
    const remaining = maxHours - used;

    if (remaining <= 0) {
      return res.status(400).json({
        error: "Worker has no available hours"
      });
    }

    // ✅ CORE LOGIC FIX
    const workersNeeded = Math.ceil(
      sched.estimated_man_hours / expected_hours_per_worker
    );

    const hoursToAssign = Math.min(
      expected_hours_per_worker,
      sched.estimated_man_hours
    );

    // insert assignment
    const [result] = await db.query(
      `INSERT INTO task_assignments
       (task_id, field_id, worker_id, assigned_by, status,
        assigned_date, expected_hours, deadline_time)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        sched.task_id,
        sched.field_id,
        workerId,
        supervisorUserId,
        assignDate,
        hoursToAssign,
        deadline_time || null
      ]
    );

    // get worker info
    const [workerInfo] = await db.query(
      `SELECT user_id, full_name, email FROM users WHERE user_id = ?`,
      [worker_user_id]
    );

    if (workerInfo.length) {
      const w = workerInfo[0];

      await createNotification(
        w.user_id,
        "📅 New Task Assigned",
        `You have been assigned "${sched.task_name}" (${hoursToAssign}h).`,
        "task_assigned",
        result.insertId
      );

      await sendTaskEmail(
        w.email,
        w.full_name,
        "New Task Assigned",
        `<p>Hello ${w.full_name},</p>
         <p>Task: <b>${sched.task_name}</b></p>
         <p>Hours: <b>${hoursToAssign}h</b></p>`
      );
    }

    // socket emit
    if (req.app?.get("io")) {
      req.app.get("io").to(`user_${worker_user_id}`).emit("notification", {
        title: "📅 New Task Assigned",
        message: `You got "${sched.task_name}" (${hoursToAssign}h)`,
        type: "task_assigned"
      });
    }

    return res.status(201).json({
      assignment_id: result.insertId,
      worker_id: workerId,
      task_id: sched.task_id,
      field_id: sched.field_id,
      hours_assigned: hoursToAssign,
      workers_needed_for_task: workersNeeded,
      hours_remaining: remaining - hoursToAssign,
      message: "Worker assigned successfully"
    });

  } catch (err) {
    console.error("assignWorkerToScheduledTask:", err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/schedule/unassign
export const unassignWorker = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Supervisor required" });
    const { assignment_id } = req.body;

    // get assignment
    const [assignRows] = await db.query(
      `SELECT ta.assignment_id, ta.worker_id, ta.task_id, ta.field_id, ta.status,
              t.task_name, u.user_id AS worker_user_id, u.full_name, u.email
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.task_id
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.assignment_id = ?`,
      [assignment_id]
    );
    if (!assignRows.length) return res.status(404).json({ error: "Assignment not found" });
    const assign = assignRows[0];

    // verify supervisor field access
    const [supCheck] = await db.query(
      `SELECT supervisor_id FROM supervisors WHERE user_id = ? AND field_id = ?`,
      [supervisorUserId, assign.field_id]
    );
    if (!supCheck.length) return res.status(403).json({ error: "Not your field" });

    // delete assignment
    await db.query(`DELETE FROM task_assignments WHERE assignment_id = ?`, [assignment_id]);

    // notification
    await createNotification(
      assign.worker_user_id,
      "📅 Task Unassigned",
      `You have been unassigned from "${assign.task_name}".`,
      "task_unassigned",
      null
    );
    await sendTaskEmail(
      assign.email,
      assign.full_name,
      "Task Unassigned",
      `<p>Hello ${assign.full_name},</p>
       <p>You have been unassigned from task: <b>${assign.task_name}</b></p>`
    );

    // socket
    if (req.app?.get("io")) {
      req.app.get("io").to(`user_${assign.worker_user_id}`).emit("notification", {
        title: "📅 Task Unassigned",
        message: `Unassigned from "${assign.task_name}"`,
        type: "task_unassigned"
      });
    }

    res.json({ message: "Worker unassigned successfully" });
  } catch (err) {
    console.error("unassignWorker:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── POST /api/schedule/update-status
export const updateAssignmentStatus = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Supervisor required" });
    const { assignment_id, status } = req.body; // 'in_progress', 'completed'

    // get assignment
    const [assignRows] = await db.query(
      `SELECT ta.assignment_id, ta.worker_id, ta.task_id, ta.field_id, ta.status, ta.expected_hours,
              fts.schedule_id, ct.frequency_days, t.task_name,
              u.user_id AS worker_user_id, u.full_name, u.email
       FROM task_assignments ta
       JOIN field_task_schedule fts ON ta.task_id = fts.task_id AND ta.field_id = fts.field_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       JOIN tasks t ON ta.task_id = t.task_id
       JOIN workers w ON ta.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE ta.assignment_id = ?`,
      [assignment_id]
    );
    if (!assignRows.length) return res.status(404).json({ error: "Assignment not found" });
    const assign = assignRows[0];

    // verify supervisor
    const [supCheck] = await db.query(
      `SELECT supervisor_id FROM supervisors WHERE user_id = ? AND field_id = ?`,
      [supervisorUserId, assign.field_id]
    );
    if (!supCheck.length) return res.status(403).json({ error: "Not your field" });

    // update status
    const now = new Date();
    if (status === 'completed') {
      await db.query(
        `UPDATE task_assignments SET status = 'completed', completed_at = ? WHERE assignment_id = ?`,
        [now, assignment_id]
      );

      const [allAssignments] = await db.query(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
         FROM task_assignments
         WHERE task_id = ? AND field_id = ? AND assigned_date = ?`,
        [assign.task_id, assign.field_id, assign.assigned_date]
      );

      const allCompleted = allAssignments[0].total > 0 && allAssignments[0].total === allAssignments[0].completed;
      if (allCompleted) {
        await db.query(
          `UPDATE field_task_schedule SET pending_verification = 1, pending_assignment_id = ? WHERE schedule_id = ?`,
          [assignment_id, assign.schedule_id]
        );
      }
    } else if (status === 'in_progress') {
      await db.query(
        `UPDATE task_assignments SET status = 'in_progress' WHERE assignment_id = ?`,
        [assignment_id]
      );
    }

    // notification
    const statusMsg = status === 'completed' ? 'marked as completed' : 'started';
    await createNotification(
      assign.worker_user_id,
      "📅 Task Status Updated",
      `Your task "${assign.task_name}" has been ${statusMsg}.`,
      "task_status_update",
      assignment_id
    );
    await sendTaskEmail(
      assign.email,
      assign.full_name,
      "Task Status Updated",
      `<p>Hello ${assign.full_name},</p>
       <p>Your task "${assign.task_name}" has been ${statusMsg}.</p>`
    );

    // socket
    if (req.app?.get("io")) {
      req.app.get("io").to(`user_${assign.worker_user_id}`).emit("notification", {
        title: "📅 Task Status Updated",
        message: `Task "${assign.task_name}" ${statusMsg}`,
        type: "task_status_update"
      });
    }

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("updateAssignmentStatus:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── POST /api/schedule/pause
export const pauseTask = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Supervisor required" });
    const { schedule_id } = req.body;

    // get schedule
    const [schedRows] = await db.query(
      `SELECT fts.schedule_id, fts.field_id, fts.next_due_date, t.task_name
       FROM field_task_schedule fts
       JOIN tasks t ON fts.task_id = t.task_id
       WHERE fts.schedule_id = ?`,
      [schedule_id]
    );
    if (!schedRows.length) return res.status(404).json({ error: "Schedule not found" });
    const sched = schedRows[0];

    // verify supervisor
    const [supCheck] = await db.query(
      `SELECT supervisor_id FROM supervisors WHERE user_id = ? AND field_id = ?`,
      [supervisorUserId, sched.field_id]
    );
    if (!supCheck.length) return res.status(403).json({ error: "Not your field" });

    // update next_due_date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await db.query(
      `UPDATE field_task_schedule SET next_due_date = ? WHERE schedule_id = ?`,
      [tomorrow, schedule_id]
    );

    res.json({ message: "Task paused to tomorrow" });
  } catch (err) {
    console.error("pauseTask:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── POST /api/schedule/worker-complete
export const workerMarkComplete = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { assignment_id } = req.body;

    await conn.query(
      `UPDATE task_assignments SET status='completed', completed_at=NOW() WHERE assignment_id=?`,
      [assignment_id]
    );

    const [assignRows] = await conn.query(
      "SELECT task_id, field_id FROM task_assignments WHERE assignment_id=?",
      [assignment_id]
    );
    if (!assignRows.length) throw new Error("Assignment not found");
    const { task_id, field_id } = assignRows[0];

    await conn.query(
      `UPDATE field_task_schedule SET pending_verification=1, pending_assignment_id=?
       WHERE task_id=? AND field_id=?`,
      [assignment_id, task_id, field_id]
    );

    // Notify supervisor
    const [[sup]] = await conn.query(
      `SELECT s.user_id, u.full_name, u.email FROM supervisors s
       JOIN users u ON s.user_id=u.user_id WHERE s.field_id=?`,
      [field_id]
    );
    if (sup) {
      const [[taskInfo]] = await conn.query(
        `SELECT t.task_name, f.field_name FROM tasks t, fields f WHERE t.task_id=? AND f.field_id=?`,
        [task_id, field_id]
      );
      await createNotification(
        sup.user_id,
        "✅ Task Ready for Verification",
        `A worker completed "${taskInfo?.task_name}" at ${taskInfo?.field_name}. Please verify.`,
        "task_completed",
        assignment_id
      );
      if (req.app?.get('io')) {
        req.app.get('io').to(`user_${sup.user_id}`).emit('notification', {
          title: "✅ Task Ready for Verification",
          message: `A worker completed "${taskInfo?.task_name}" at ${taskInfo?.field_name}.`,
          type: "task_completed"
        });
      }
    }

    await conn.commit();
    res.json({ message: "Marked complete — awaiting verification" });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/schedule/verify
export const supervisorVerify = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const supervisorUserId = req.user?.id;
    if (!supervisorUserId) return res.status(401).json({ error: "Supervisor required" });

    const { assignment_id, action, reject_reason, task_id, field_id } = req.body;
    let { schedule_id } = req.body;

    if (!assignment_id || !action) {
      return res.status(400).json({ error: "assignment_id and action are required" });
    }

    // Resolve schedule_id if not provided — look it up from task_id + field_id
    if (!schedule_id && task_id && field_id) {
      const [schRows] = await conn.query(
        `SELECT schedule_id FROM field_task_schedule WHERE task_id=? AND field_id=?`,
        [task_id, field_id]
      );
      if (schRows.length) schedule_id = schRows[0].schedule_id;
    }

    if (!schedule_id) {
      // Try to get it from the assignment itself
      const [aRows] = await conn.query(
        `SELECT task_id, field_id FROM task_assignments WHERE assignment_id=?`,
        [assignment_id]
      );
      if (aRows.length) {
        const [schRows] = await conn.query(
          `SELECT schedule_id FROM field_task_schedule WHERE task_id=? AND field_id=?`,
          [aRows[0].task_id, aRows[0].field_id]
        );
        if (schRows.length) schedule_id = schRows[0].schedule_id;
      }
    }

    if (action === "approve") {
      // Get assignment details to check if ALL workers are complete
      const [assignmentInfo] = await conn.query(
        `SELECT task_id, field_id, assigned_date FROM task_assignments WHERE assignment_id=?`,
        [assignment_id]
      );
      if (!assignmentInfo.length) {
        await conn.rollback();
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      const { task_id: assignTask, field_id: assignField, assigned_date } = assignmentInfo[0];
      
      // Check if ALL workers assigned to this task on this date have completed
      const [allAssignments] = await conn.query(
        `SELECT assignment_id, status FROM task_assignments 
         WHERE task_id=? AND field_id=? AND assigned_date=?`,
        [assignTask, assignField, assigned_date]
      );
      
      const allCompleted = allAssignments.every(a => a.status === 'completed');
      if (!allCompleted) {
        await conn.rollback();
        const pending = allAssignments.filter(a => a.status !== 'completed').length;
        return res.status(400).json({ 
          error: `Cannot approve yet. ${pending} worker(s) still need to complete their tasks.` 
        });
      }

      await conn.query(
        `UPDATE task_assignments SET verified_by=?, verified_at=NOW(), status='completed' WHERE assignment_id=?`,
        [supervisorUserId, assignment_id]
      );

      if (schedule_id) {
        const [schedRows] = await conn.query(
          `SELECT fts.*, ct.frequency_days FROM field_task_schedule fts
           JOIN crop_tasks ct ON fts.crop_task_id=ct.crop_task_id WHERE fts.schedule_id=?`,
          [schedule_id]
        );
        if (schedRows.length) {
          const sched = schedRows[0];

          const [assignRows] = await conn.query(
            `SELECT completed_at FROM task_assignments WHERE assignment_id = ?`,
            [assignment_id]
          );
          let completionDate = new Date();
          if (assignRows.length && assignRows[0].completed_at) {
            completionDate = new Date(assignRows[0].completed_at);
          }

          const lastDoneStr = `${completionDate.getFullYear()}-${String(completionDate.getMonth()+1).padStart(2,'0')}-${String(completionDate.getDate()).padStart(2,'0')}`;
          const nextDue = new Date(completionDate);
          nextDue.setDate(nextDue.getDate() + sched.frequency_days);
          const nextDueStr = `${nextDue.getFullYear()}-${String(nextDue.getMonth()+1).padStart(2,'0')}-${String(nextDue.getDate()).padStart(2,'0')}`;

          await conn.query(
            `UPDATE field_task_schedule
             SET last_done_date=?, next_due_date=?, pending_verification=0, pending_assignment_id=NULL, is_dismissed=0
             WHERE schedule_id=?`,
            [lastDoneStr, nextDueStr, schedule_id]
          );

          const [aInfo] = await conn.query(
            `SELECT ta.worker_id, u.full_name, u.email, u.user_id, t.task_name, f.field_name
             FROM task_assignments ta
             JOIN workers w ON ta.worker_id=w.worker_id JOIN users u ON w.user_id=u.user_id
             JOIN tasks t ON ta.task_id=t.task_id JOIN fields f ON ta.field_id=f.field_id
             WHERE ta.assignment_id=?`,
            [assignment_id]
          );
          if (aInfo.length) {
            const w = aInfo[0];
            await createNotification(
              w.user_id,
              `✅ Task Approved: ${w.task_name}`,
              `Your task "${w.task_name}" at ${w.field_name} was approved. Next due: ${nextDueStr}`,
              "task_verified",
              assignment_id
            );
            await sendTaskEmail(w.email, w.full_name, "[Plantro] Task Approved",
              `<p>Your task <b>${w.task_name}</b> at <b>${w.field_name}</b> was approved!</p><p>Next due: ${nextDueStr}</p>`
            );
            if (req.app?.get('io')) {
              req.app.get('io').to(`user_${w.user_id}`).emit('notification', {
                title: `✅ Task Approved: ${w.task_name}`,
                message: `Your task "${w.task_name}" was approved. Next due: ${nextDueStr}`,
                type: "task_verified"
              });
            }
          }
          await conn.commit();
          return res.json({ message: "Task approved", next_due_date: nextDueStr });
        }
      }

      await conn.commit();
      return res.json({ message: "Task approved" });
    }

    if (action === "reject") {
      await conn.query(
        `UPDATE task_assignments SET status='rejected', remarks=? WHERE assignment_id=?`,
        [reject_reason || "Rejected by supervisor", assignment_id]
      );

      if (schedule_id) {
        await conn.query(
          `UPDATE field_task_schedule SET pending_verification=0, pending_assignment_id=NULL WHERE schedule_id=?`,
          [schedule_id]
        );
      }

      const [aInfo] = await conn.query(
        `SELECT ta.worker_id, u.full_name, u.email, u.user_id, t.task_name
         FROM task_assignments ta JOIN workers w ON ta.worker_id=w.worker_id
         JOIN users u ON w.user_id=u.user_id JOIN tasks t ON ta.task_id=t.task_id
         WHERE ta.assignment_id=?`,
        [assignment_id]
      );
      if (aInfo.length) {
        const w = aInfo[0];
        await createNotification(
          w.user_id,
          `❌ Task Rejected`,
          `Task "${w.task_name}" was rejected. Reason: ${reject_reason || "No reason provided"}`,
          "task_rejected",
          assignment_id
        );
        await sendTaskEmail(w.email, w.full_name, "[Plantro] Task Rejected",
          `<p>Your task <b>${w.task_name}</b> was rejected.</p><p>Reason: ${reject_reason || "No reason provided"}</p>`
        );
        if (req.app?.get('io')) {
          req.app.get('io').to(`user_${w.user_id}`).emit('notification', {
            title: `❌ Task Rejected`,
            message: `Task "${w.task_name}" was rejected. Reason: ${reject_reason || "No reason provided"}`,
            type: "task_rejected"
          });
        }
      }

      await conn.commit();
      return res.json({ message: "Task rejected" });
    }

    return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
  } catch (err) {
    await conn.rollback();
    console.error("supervisorVerify:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/schedule/dismiss — supervisor pauses task → tomorrow
export const dismissTask = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    const { schedule_id, new_due_date } = req.body;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = new_due_date || `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    const [schedInfo] = await db.query(
      `SELECT fts.task_id, fts.field_id, t.task_name
       FROM field_task_schedule fts JOIN tasks t ON fts.task_id=t.task_id
       WHERE fts.schedule_id=?`,
      [schedule_id]
    );

    await db.query(
      `UPDATE field_task_schedule SET next_due_date=?, is_dismissed=0 WHERE schedule_id=?`,
      [newDate, schedule_id]
    );

    if (schedInfo.length) {
      const { task_id, field_id, task_name } = schedInfo[0];

      // Move assigned tasks to tomorrow so workers can continue them there
      const [pendingWorkers] = await db.query(
        `SELECT ta.assignment_id, w.user_id, u.full_name, u.email
         FROM task_assignments ta
         JOIN workers w ON ta.worker_id=w.worker_id JOIN users u ON w.user_id=u.user_id
         WHERE ta.task_id=? AND ta.field_id=? AND DATE(ta.assigned_date)=CURDATE() AND ta.status IN ('pending','in_progress')`,
        [task_id, field_id]
      );

      if (pendingWorkers.length) {
        await db.query(
          `UPDATE task_assignments SET assigned_date=?, status='pending'
           WHERE task_id=? AND field_id=? AND DATE(assigned_date)=CURDATE() AND status IN ('pending','in_progress')`,
          [newDate, task_id, field_id]
        );

        for (const worker of pendingWorkers) {
          await createNotification(
            worker.user_id,
            "📅 Task Postponed",
            `Task "${task_name}" has been postponed to ${newDate} by supervisor.`,
            "task_assigned",
            null
          );
          await sendTaskEmail(worker.email, worker.full_name, "[Plantro] Task Postponed",
            `<p>Hi ${worker.full_name},</p><p>Task <b>${task_name}</b> has been postponed to <b>${newDate}</b>.</p>`
          );
          if (req.app?.get('io')) {
            req.app.get('io').to(`user_${worker.user_id}`).emit('notification', {
              title: "📅 Task Postponed",
              message: `Task "${task_name}" has been postponed to ${newDate}.`,
              type: "task_assigned"
            });
          }
        }
      }
    }

    res.json({ message: "Task postponed", next_due_date: newDate });
  } catch (err) {
    console.error("dismissTask:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET /api/schedule/workers-available
export const getWorkersForSchedule = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;
    const { date, field_id, task_id } = req.query;
    const queryDate = date || getLocalDate();

    // Get supervisor's fields
    const [supFields] = await db.query(
      `SELECT field_id FROM supervisors WHERE user_id=?`,
      [supervisorUserId]
    );
    const supervisorFieldIds = supFields.map(f => f.field_id);
    const targetFieldId = field_id ? Number(field_id) : (supervisorFieldIds[0] || null);

    const safeParse = (d) => {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      try { return JSON.parse(d); } catch (e) { 
        console.warn("Parse error for:", d, e);
        return []; 
      }
    };

    let requiredSkills = [];
    if (task_id) {
      try {
        const [skills] = await db.query(
          `SELECT skill_name FROM task_skills WHERE task_id=?`, [task_id]
        );
        requiredSkills = skills.map(s => s.skill_name.toLowerCase().trim());
      } catch (skillError) {
        // task_skills table may not exist; skip skill filtering
        console.warn("Skill filtering unavailable:", skillError.message);
        requiredSkills = [];
      }
    }

    const [workers] = await db.query(
      `SELECT w.worker_id, w.user_id, w.skills, w.preferred_locations, w.max_daily_hours,
              u.full_name, u.phone,
              COALESCE(wa.status,'available') AS availability_status
       FROM workers w
       JOIN users u ON w.user_id=u.user_id
       LEFT JOIN worker_availability wa ON wa.worker_id=w.worker_id AND wa.date=?
       WHERE u.status='ACTIVE' AND u.role_id=3`,
      [queryDate]
    );

    // Attendance check
    const [attendance] = await db.query(
      `SELECT worker_id, status FROM attendance WHERE date=?`,
      [queryDate]
    );
    const attendanceMap = {};
    attendance.forEach(a => { attendanceMap[a.worker_id] = a.status; });

    let parsed = workers.map(w => {
      try {
        const skillsArray = safeParse(w.skills) || [];
        const locationsArray = safeParse(w.preferred_locations) || [];
        return {
          ...w,
          skills: skillsArray.map(s => String(s || '').toLowerCase().trim()).filter(s => s),
          preferred_locations: locationsArray.map(loc => {
            const num = Number(loc);
            return isNaN(num) ? null : num;
          }).filter(n => n !== null)
        };
      } catch (e) {
        console.error("Error parsing worker:", w.worker_id, e);
        return {
          ...w,
          skills: [],
          preferred_locations: []
        };
      }
    });

    const [hoursUsed] = await db.query(
      `SELECT worker_id, SUM(expected_hours) AS used
       FROM task_assignments
       WHERE assigned_date=? AND status!='rejected'
       GROUP BY worker_id`,
      [queryDate]
    );

    const hoursMap = {};
    hoursUsed.forEach(h => {
      hoursMap[h.worker_id] = Number(h.used);
    });

    const filtered = parsed.filter(w => {
      const used = hoursMap[w.worker_id] || 0;
      const maxHours = Number(w.max_daily_hours) || 8;
      const remaining = maxHours - used;

      if (w.availability_status !== "available") return false;
      if (remaining <= 0) return false;

      // ✅ ONLY supervisor fields allowed
      if (w.preferred_locations && Array.isArray(w.preferred_locations) && w.preferred_locations.length > 0) {
        const match = w.preferred_locations.some(loc => {
          const locNum = Number(loc);
          return !isNaN(locNum) && supervisorFieldIds.includes(locNum);
        });
        if (!match) return false;
      }

      // If has required skills, must have at least one
      if (requiredSkills && Array.isArray(requiredSkills) && requiredSkills.length > 0) {
        if (!w.skills || !Array.isArray(w.skills) || w.skills.length === 0) return false;
        const ok = requiredSkills.some(s => w.skills.includes(s));
        if (!ok) return false;
      }

      return true;
    });

    res.json(filtered.map(w => ({
      ...w,
      hours_used: hoursMap[w.worker_id] || 0,
      hours_remaining: (w.max_daily_hours || 8) - (hoursMap[w.worker_id] || 0),
      attendance_status: attendanceMap[w.worker_id] || 'not_marked'
    })));
  } catch (err) {
    console.error("getWorkersForSchedule error:", err);
    res.status(500).json({ error: "Database error: " + err.message });
  }
};
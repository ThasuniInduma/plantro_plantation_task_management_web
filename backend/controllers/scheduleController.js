import { db } from "../config/db.js";
import { createNotification, sendTaskEmail } from "./notificationController.js";

// ── GET /api/schedule/today
export const getTodaySchedule = async (req, res) => {
  try {
    const supervisorUserId = req.user?.id;

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const today = new Date().toISOString().split('T')[0];

    const [fields] = await db.query(
      `SELECT 
          f.field_id, 
          f.field_name, 
          f.location, 
          f.area,
          c.crop_id, 
          c.crop_name
      FROM fields f
      JOIN crops c ON f.crop_id = c.crop_id
      JOIN supervisors s ON f.field_id = s.field_id
      WHERE s.user_id = ?`,
      [supervisorUserId]
    );

    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const [dueTasks] = await db.query(
      `SELECT
         fts.schedule_id,
         fts.field_id,
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
         DATEDIFF(CURDATE(), fts.next_due_date) AS days_overdue
       FROM field_task_schedule fts
       JOIN tasks      t  ON fts.task_id      = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       WHERE fts.field_id IN (?)
         AND (fts.next_due_date <= CURDATE() OR fts.pending_verification = 1)
         AND fts.is_dismissed = 0`,
      [fieldIds]
    );

    if (!dueTasks.length) return res.json([]);

    // Get assignments for today + any completed/pending-verify ones
    const [assignments] = await db.query(
      `SELECT ta.assignment_id, ta.task_id, ta.field_id,
              ta.worker_id, ta.status, ta.expected_hours,
              ta.completed_at, ta.verified_at,
              u.full_name AS worker_name
       FROM task_assignments ta
       JOIN users u ON ta.worker_id = u.user_id
       WHERE ta.field_id IN (?)
         AND (
           ta.assigned_date = ?
           OR ta.status IN ('completed', 'in_progress')
         )
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
          const totalAssigned = taskAssignments
            .reduce((s, a) => s + Number(a.expected_hours || 0), 0);

          return {
            ...task,
            assignments:          taskAssignments,
            workers_needed:       Math.ceil(task.estimated_man_hours / 8),
            total_hours_assigned: totalAssigned,
            is_fully_assigned:    totalAssigned >= task.estimated_man_hours,
            needs_verification:   task.pending_verification === 1
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

// ── GET /api/schedule/upcoming?days=7
export const getUpcomingSchedule = async (req, res) => {
  try {
    const supervisorUserId =
  req.user?.id ?? Number(req.body.assigned_by);

if (!supervisorUserId) {
  return res.status(401).json({ error: "Supervisor required" });
}
    const days = Number(req.query.days) || 7;

    const [fields] = await db.query(
      `SELECT f.field_id
      FROM fields f
      JOIN supervisors s ON f.field_id = s.field_id
      WHERE s.user_id = ?`,
      [supervisorUserId]
    );
    if (!fields.length) return res.json([]);
    const fieldIds = fields.map(f => f.field_id);

    const [rows] = await db.query(
      `SELECT
         fts.schedule_id, fts.field_id, fts.task_id,
         fts.next_due_date, fts.last_done_date,
         t.task_name,
         ct.estimated_man_hours, ct.frequency_days,
         f.field_name, c.crop_name,
         DATEDIFF(fts.next_due_date, CURDATE()) AS days_until_due
       FROM field_task_schedule fts
       JOIN tasks      t  ON fts.task_id      = t.task_id
       JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
       JOIN fields     f  ON fts.field_id     = f.field_id
       JOIN crops      c  ON f.crop_id        = c.crop_id
       WHERE fts.field_id IN (?)
         AND fts.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL ? DAY)
         AND fts.is_dismissed   = 0
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
    const supervisorUserId =
      req.user?.id ?? Number(req.body.assigned_by);

    if (!supervisorUserId) {
      return res.status(401).json({ error: "Supervisor required" });
    }

    const {
      schedule_id,
      worker_user_id,
      date,
      deadline_time
    } = req.body;

    const assignDate =
      date || new Date().toISOString().split("T")[0];

    // ── STEP 1: get schedule (YOUR DB)
    const [schedRows] = await db.query(
      `SELECT 
          fts.schedule_id,
          fts.field_id,
          fts.task_id,
          ct.estimated_man_hours,
          t.task_name
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

    // ── STEP 2: convert user_id → worker_id
    const [workerRow] = await db.query(
      `SELECT worker_id, max_daily_hours 
       FROM workers 
       WHERE user_id = ?`,
      [worker_user_id]
    );

    if (!workerRow.length) {
      return res.status(400).json({
        error: "Worker profile not found"
      });
    }

    const workerId = workerRow[0].worker_id;
    const maxHours = workerRow[0].max_daily_hours || 8;

    // ── STEP 3: calculate hours already used
    const [hoursUsedRows] = await db.query(
      `SELECT COALESCE(SUM(expected_hours),0) AS used
       FROM task_assignments
       WHERE worker_id = ?
         AND assigned_date = ?
         AND status != 'rejected'`,
      [workerId, assignDate]
    );

    const used = Number(hoursUsedRows[0].used);
    const remaining = maxHours - used;

    if (remaining <= 0) {
      return res.status(400).json({
        error: "Worker has no available hours today"
      });
    }

    // ── STEP 4: hours to assign
    const hoursToAssign = Math.min(
      sched.estimated_man_hours,
      remaining
    );

    // ── STEP 5: INSERT assignment
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

    // ── STEP 6: return response
    return res.status(201).json({
      assignment_id: result.insertId,
      worker_id: workerId,
      task_id: sched.task_id,
      field_id: sched.field_id,
      hours_assigned: hoursToAssign,
      hours_remaining: remaining - hoursToAssign,
      message: "Worker assigned successfully"
    });

  } catch (err) {
    console.error("assignWorkerToScheduledTask:", err);
    res.status(500).json({ error: err.message });
  }
};
// ── POST /api/schedule/worker-complete
// Worker marks their assignment as done — awaits supervisor verification
export const workerMarkComplete = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { assignment_id } = req.body;
    const today = new Date().toISOString().split('T')[0];

    await conn.query(
      `UPDATE task_assignments
       SET status       = 'completed',
           completed_at = NOW()
       WHERE assignment_id = ?`,
      [assignment_id]
    );

    const [assignRows] = await conn.query(
      "SELECT task_id, field_id FROM task_assignments WHERE assignment_id = ?",
      [assignment_id]
    );
    if (!assignRows.length) throw new Error("Assignment not found");

    const { task_id, field_id } = assignRows[0];

    // Set pending_verification so supervisor sees it
    await conn.query(
      `UPDATE field_task_schedule
       SET pending_verification  = 1,
           pending_assignment_id = ?
       WHERE task_id  = ? AND field_id = ?`,
      [assignment_id, task_id, field_id]
    );

    await conn.commit();
    res.json({ message: "Task marked as completed — awaiting supervisor verification" });
  } catch (err) {
    await conn.rollback();
    console.error("workerMarkComplete:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/schedule/verify — supervisor approves or rejects
export const supervisorVerify = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const supervisorUserId =
  req.user?.id ?? Number(req.body.assigned_by);

if (!supervisorUserId) {
  return res.status(401).json({ error: "Supervisor required" });
}
    const { schedule_id, assignment_id, action, reject_reason } = req.body;
    const today = new Date().toISOString().split('T')[0];

    if (!schedule_id || !assignment_id || !action) {
      return res.status(400).json({ error: "schedule_id, assignment_id, action required" });
    }

    if (action === 'approve') {
      // Mark assignment verified
      await conn.query(
        `UPDATE task_assignments
         SET verified_by = ?,
             verified_at = NOW(),
             status      = 'completed'
         WHERE assignment_id = ?`,
        [supervisorUserId, assignment_id]
      );

      // Get frequency for next due date
      const [schedRows] = await conn.query(
        `SELECT fts.*, ct.frequency_days
         FROM field_task_schedule fts
         JOIN crop_tasks ct ON fts.crop_task_id = ct.crop_task_id
         WHERE fts.schedule_id = ?`,
        [schedule_id]
      );
      if (!schedRows.length) throw new Error("Schedule not found");

      const sched   = schedRows[0];
      const nextDue = new Date(today);
      nextDue.setDate(nextDue.getDate() + sched.frequency_days);
      const nextDueStr = nextDue.toISOString().split('T')[0];

      // Reset schedule — task done, next cycle starts
      await conn.query(
        `UPDATE field_task_schedule
         SET last_done_date        = ?,
             next_due_date         = ?,
             pending_verification  = 0,
             pending_assignment_id = NULL,
             is_dismissed          = 0
         WHERE schedule_id = ?`,
        [today, nextDueStr, schedule_id]
      );

      await conn.commit();
      res.json({
        message:        "Task approved",
        next_due_date:  nextDueStr,
        last_done_date: today
      });

    } else if (action === 'reject') {
      // Mark assignment rejected
      await conn.query(
        `UPDATE task_assignments
         SET status  = 'rejected',
             remarks = ?
         WHERE assignment_id = ?`,
        [reject_reason || 'Rejected by supervisor', assignment_id]
      );

      // Clear pending verification — task re-appears as unassigned
      await conn.query(
        `UPDATE field_task_schedule
         SET pending_verification  = 0,
             pending_assignment_id = NULL
         WHERE schedule_id = ?`,
        [schedule_id]
      );

      await conn.commit();
      res.json({ message: "Task rejected — worker needs to redo" });
      const [assignInfo] = await conn.query(
        `SELECT ta.worker_id, u.full_name AS worker_name, u.email,
                t.task_name, f.field_name
        FROM task_assignments ta
        JOIN users u ON ta.worker_id = u.user_id
        JOIN tasks t ON ta.task_id = t.task_id
        JOIN fields f ON ta.field_id = f.field_id
        WHERE ta.assignment_id = ?`,
        [assignment_id]
      );
      if (assignInfo.length) {
        const w = assignInfo[0];
        await createNotification(
          w.worker_id,
          `❌ Task Rejected: ${w.task_name}`,
          `Your completion of "${w.task_name}" was rejected. Reason: ${reject_reason || 'See supervisor'}. Please redo the task.`,
          'task_rejected',
          assignment_id
        );
      }
    } else {
      return res.status(400).json({ error: "action must be 'approve' or 'reject'" });
      // Notify worker of approval
      const [assignInfo] = await conn.query(
        `SELECT ta.worker_id, u.full_name AS worker_name, u.email,
                t.task_name, f.field_name
        FROM task_assignments ta
        JOIN users u ON ta.worker_id = u.user_id
        JOIN tasks t ON ta.task_id = t.task_id
        JOIN fields f ON ta.field_id = f.field_id
        WHERE ta.assignment_id = ?`,
        [assignment_id]
      );
      if (assignInfo.length) {
        const w = assignInfo[0];
        await createNotification(
          w.worker_id,
          `✅ Task Approved: ${w.task_name}`,
          `Your completion of "${w.task_name}" at ${w.field_name} has been approved. Next due in ${sched.frequency_days} days.`,
          'task_verified',
          assignment_id
        );
        await sendTaskEmail(w.email, w.worker_name,
          `[Plantro] Task Approved: ${w.task_name}`,
          `<p>Hi ${w.worker_name}, your task <strong>${w.task_name}</strong> at <strong>${w.field_name}</strong> has been <span style="color:#10b981;font-weight:700">approved</span> by your supervisor. Well done!</p>`
        );
      }
    }
  } catch (err) {
    await conn.rollback();
    console.error("supervisorVerify:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

// ── POST /api/schedule/dismiss
export const dismissTask = async (req, res) => {
  try {
    const { schedule_id, new_due_date } = req.body;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const newDate = new_due_date || tomorrow.toISOString().split('T')[0];

    await db.query(
      `UPDATE field_task_schedule
       SET is_dismissed   = 1,
           dismissed_date = CURDATE(),
           next_due_date  = ?
       WHERE schedule_id = ?`,
      [newDate, schedule_id]
    );

    res.json({ message: "Task postponed", next_due_date: newDate });
  } catch (err) {
    console.error("dismissTask:", err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET /api/schedule/workers-available
// ── GET /api/schedule/workers-available
// ── GET /api/schedule/workers-available
export const getWorkersForSchedule = async (req, res) => {
  try {
    const { date, field_id, task_id } = req.query;
    const queryDate =
      date || new Date().toISOString().split("T")[0];

    const safeParse = (d) => {
      if (!d) return [];
      if (Array.isArray(d)) return d;
      try { return JSON.parse(d); } catch { return []; }
    };

    // STEP 1: required skills
    let requiredSkills = [];
    if (task_id) {
      const [skills] = await db.query(
        `SELECT skill_name FROM task_skills WHERE task_id = ?`,
        [task_id]
      );
      requiredSkills = skills.map(s =>
        s.skill_name.toLowerCase().trim()
      );
    }

    // STEP 2: workers
    const [workers] = await db.query(
      `SELECT w.worker_id, w.user_id, w.skills,
              w.preferred_locations, w.max_daily_hours,
              u.full_name, u.phone,
              COALESCE(wa.status,'available') AS availability_status
       FROM workers w
       JOIN users u ON w.user_id = u.user_id
       LEFT JOIN worker_availability wa
         ON wa.worker_id = w.worker_id AND wa.date = ?
       WHERE u.status='ACTIVE' AND u.role_id=3`,
      [queryDate]
    );

    // STEP 3: normalize
    let parsed = workers.map(w => ({
      ...w,
      skills: safeParse(w.skills).map(s =>
        String(s).toLowerCase().trim()
      ),
      preferred_locations: safeParse(w.preferred_locations).map(Number)
    }));

    // STEP 4: hours used
    const [hoursUsed] = await db.query(
      `SELECT worker_id, SUM(expected_hours) AS used
       FROM task_assignments
       WHERE assigned_date = ? AND status!='rejected'
       GROUP BY worker_id`,
      [queryDate]
    );

    const hoursMap = {};
    hoursUsed.forEach(h => {
      hoursMap[h.worker_id] = Number(h.used);
    });

    // STEP 5: filter
    const filtered = parsed.filter(w => {
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
        hours_remaining:
          w.max_daily_hours - (hoursMap[w.worker_id] || 0)
      }))
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// ── GET /api/schedule/worker-tasks
export const getWorkerTasks = async (req, res) => {
  try {
    const workerUserId = req.user?.id || Number(req.query.user_id);
    const today = new Date().toISOString().split("T")[0];

    const [rows] = await db.query(
      `SELECT ta.assignment_id, ta.task_id, ta.field_id,
              ta.status, ta.expected_hours, ta.assigned_date,
              ta.completed_at,
              t.task_name, t.description,
              f.field_name, f.location
       FROM task_assignments ta
       JOIN tasks t ON ta.task_id = t.task_id
       JOIN fields f ON ta.field_id = f.field_id
       WHERE ta.worker_id = (
         SELECT worker_id FROM workers WHERE user_id = ?
       )
       AND ta.assigned_date = ?
       AND ta.status != 'rejected'`,
      [workerUserId, today]
    );

    res.json(rows);
  } catch (err) {
    console.error("getWorkerTasks:", err);
    res.status(500).json({ error: "Database error" });
  }
};
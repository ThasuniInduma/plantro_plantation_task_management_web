import { db } from "../config/db.js";

// GET WORKER TASKS
export const getWorkerTasks = async (req, res) => {

  const { workerId } = req.params;

  try {

    const [tasks] = await db.query(
      `
      SELECT 
      ta.assignment_id,
      ta.status,
      ta.assigned_date,
      ta.expected_hours,
      t.task_name,
      t.description,
      f.field_name,
      c.crop_name
      FROM task_assignments ta
      JOIN tasks t ON ta.task_id = t.task_id
      JOIN fields f ON ta.field_id = f.field_id
      JOIN crops c ON f.crop_id = c.crop_id
      WHERE ta.worker_id = ?
      `,
      [workerId]
    );

    res.json(tasks);

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};



// UPDATE TASK STATUS
export const updateTaskStatus = async (req, res) => {

  const { assignmentId } = req.params;
  const { status } = req.body;

  try {

    await db.query(
      `
      UPDATE task_assignments
      SET status = ?
      WHERE assignment_id = ?
      `,
      [status, assignmentId]
    );

    res.json({ message: "Task status updated" });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};



// MARK WORKER ATTENDANCE
export const markAttendance = async (req, res) => {

  const { worker_id, date, available_hours } = req.body;

  try {

    await db.query(
      `
      INSERT INTO worker_availability
      (worker_id,date,available_hours,status)
      VALUES (?,?,?,'available')
      `,
      [worker_id, date, available_hours]
    );

    res.json({ message: "Attendance marked successfully" });

  } catch (error) {

    res.status(500).json({ message: error.message });

  }

};
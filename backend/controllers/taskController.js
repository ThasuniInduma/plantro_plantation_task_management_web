import { db } from "../config/db.js";

// Get all tasks for a specific crop
export const getTasksByCrop = async (req, res) => {
  try {
    const cropId = req.params.cropId;
    const [tasks] = await db.query("SELECT * FROM tasks WHERE crop_id = ?", [cropId]);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// Add a task
export const addTask = async (req, res) => {
  try {
    const { crop_id, task_name, description, frequency_days, estimated_hours } = req.body;
    const [result] = await db.query(
      "INSERT INTO tasks (crop_id, task_name, description, frequency_days, estimated_hours) VALUES (?, ?, ?, ?, ?)",
      [crop_id, task_name, description, frequency_days, estimated_hours]
    );
    res.status(201).json({ task_id: result.insertId, crop_id, task_name, description, frequency_days, estimated_hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// Update task
export const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { task_name, description, frequency_days, estimated_hours } = req.body;
    await db.query(
      "UPDATE tasks SET task_name=?, description=?, frequency_days=?, estimated_hours=? WHERE task_id=?",
      [task_name, description, frequency_days, estimated_hours, taskId]
    );
    res.json({ taskId, task_name, description, frequency_days, estimated_hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// Delete task
export const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.query("DELETE FROM tasks WHERE task_id=?", [taskId]);
    res.json({ taskId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
import { db } from "../config/db.js";

export const getAllTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(
      "SELECT task_id, task_name, description FROM tasks ORDER BY task_name"
    );
    console.log("getAllTasks →", tasks.length, "rows");
    res.json(tasks);
  } catch (err) {
    console.error("getAllTasks error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const getCropTasks = async (req, res) => {
  try {
    const { cropId } = req.params;
    const [rows] = await db.query(
      `SELECT 
         ct.crop_task_id,
         ct.crop_id,
         ct.task_id,
         ct.frequency_days,
         ct.estimated_man_hours,
         t.task_name,
         t.description
       FROM crop_tasks ct
       JOIN tasks t ON ct.task_id = t.task_id
       WHERE ct.crop_id = ?`,
      [cropId]
    );
    console.log(`getCropTasks cropId=${cropId} →`, rows.length, "rows");
    res.json(rows);
  } catch (err) {
    console.error("getCropTasks error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const addCropTask = async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      crop_id,
      task_id,
      task_name,
      description,
      frequency_days,
      estimated_man_hours
    } = req.body;

    console.log("addCropTask body:", req.body);

    let finalTaskId = task_id ? Number(task_id) : null;

    if (!finalTaskId) {
      const [result] = await conn.query(
        "INSERT INTO tasks (task_name, description) VALUES (?, ?)",
        [task_name, description]
      );
      finalTaskId = result.insertId;
      console.log("New task created, task_id:", finalTaskId);
    }

    const [cropTaskResult] = await conn.query(
      `INSERT INTO crop_tasks 
         (crop_id, task_id, frequency_days, estimated_man_hours) 
       VALUES (?, ?, ?, ?)`,
      [crop_id, finalTaskId, frequency_days, estimated_man_hours]
    );

    await conn.commit();
    console.log("crop_task inserted, crop_task_id:", cropTaskResult.insertId);

    res.status(201).json({
      crop_task_id: cropTaskResult.insertId,
      crop_id: Number(crop_id),
      task_id: finalTaskId,
      task_name,
      description,
      frequency_days: Number(frequency_days),
      estimated_man_hours: Number(estimated_man_hours)
    });
  } catch (err) {
    await conn.rollback();
    console.error("addCropTask error:", err);
    res.status(500).json({ error: "Database error" });
  } finally {
    conn.release();
  }
};

export const updateCropTask = async (req, res) => {
  try {
    const { cropTaskId } = req.params;
    const { frequency_days, estimated_man_hours } = req.body;
    await db.query(
      `UPDATE crop_tasks 
       SET frequency_days = ?, estimated_man_hours = ? 
       WHERE crop_task_id = ?`,
      [frequency_days, estimated_man_hours, cropTaskId]
    );
    console.log("updateCropTask cropTaskId:", cropTaskId);
    res.json({
      cropTaskId: Number(cropTaskId),
      frequency_days: Number(frequency_days),
      estimated_man_hours: Number(estimated_man_hours)
    });
  } catch (err) {
    console.error("updateCropTask error:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const deleteCropTask = async (req, res) => {
  try {
    const { cropTaskId } = req.params;
    await db.query(
      "DELETE FROM crop_tasks WHERE crop_task_id = ?",
      [cropTaskId]
    );
    console.log("deleteCropTask cropTaskId:", cropTaskId);
    res.json({ cropTaskId: Number(cropTaskId) });
  } catch (err) {
    console.error("deleteCropTask error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
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

    let finalTaskId = task_id ? Number(task_id) : null;

    // 1. Create task if not exists
    if (!finalTaskId) {
      const [result] = await conn.query(
        "INSERT INTO tasks (task_name, description) VALUES (?, ?)",
        [task_name, description]
      );
      finalTaskId = result.insertId;
    }

    // 2. Insert crop_task
    const [cropTaskResult] = await conn.query(
      `INSERT INTO crop_tasks 
       (crop_id, task_id, frequency_days, estimated_man_hours) 
       VALUES (?, ?, ?, ?)`,
      [crop_id, finalTaskId, frequency_days, estimated_man_hours]
    );

    const cropTaskId = cropTaskResult.insertId;

    // 🔥 3. AUTO ADD TO EXISTING FIELDS
    const [fields] = await conn.query(
      "SELECT field_id FROM fields WHERE crop_id = ?",
      [crop_id]
    );

    const today = new Date().toISOString().split("T")[0];

    for (const f of fields) {
      await conn.query(
        `INSERT INTO field_task_schedule
         (field_id, task_id, crop_task_id, next_due_date)
         VALUES (?, ?, ?, ?)`,
        [f.field_id, finalTaskId, cropTaskId, today]
      );
    }

    await conn.commit();

    res.status(201).json({
      crop_task_id: cropTaskId,
      crop_id: Number(crop_id),
      task_id: finalTaskId,
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

    // 1. Update crop_tasks as before
    await db.query(
      `UPDATE crop_tasks 
       SET frequency_days = ?, estimated_man_hours = ? 
       WHERE crop_task_id = ?`,
      [frequency_days, estimated_man_hours, cropTaskId]
    );

    // 2. Recalculate next_due_date for pending schedules using this crop_task
    //    Only update schedules that haven't been completed yet (pending_verification=0)
    //    Recalculate as: last_done_date + frequency_days
    //    If last_done_date is NULL, leave next_due_date as-is (it's an initial schedule)
    await db.query(
      `UPDATE field_task_schedule
       SET next_due_date = DATE_ADD(last_done_date, INTERVAL ? DAY)
       WHERE crop_task_id = ?
         AND last_done_date IS NOT NULL
         AND pending_verification = 0`,
      [frequency_days, cropTaskId]
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
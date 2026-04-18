import { db } from "../config/db.js";

export const addHarvest = async (req, res) => {
  try {
    const supervisorId = req.user?.id;

    if (!req.body) {
      return res.status(400).json({ message: "Empty request body" });
    }

    const { field_id, quantity, unit, harvest_date } = req.body;

    if (!field_id || !quantity || !unit || !harvest_date) {
      return res.status(400).json({
        message: "Missing fields",
        received: req.body
      });
    }

    // get crop
    const [cropRows] = await db.query(
      `SELECT crop_id FROM field_crops WHERE field_id = ? LIMIT 1`,
      [field_id]
    );

    if (!cropRows.length) {
      return res.status(400).json({ message: "No crop found for field" });
    }

    const crop_id = cropRows[0].crop_id;

    // get harvesting task
    const [taskRows] = await db.query(
      `SELECT ct.crop_task_id
       FROM crop_tasks ct
       JOIN tasks t ON t.task_id = ct.task_id
       WHERE ct.crop_id = ?
       AND t.task_name = 'Harvesting'
       LIMIT 1`,
      [crop_id]
    );

    if (!taskRows.length) {
      return res.status(400).json({ message: "No harvesting task found" });
    }

    const crop_task_id = taskRows[0].crop_task_id;

    // insert
    const [result] = await db.query(
      `INSERT INTO harvest_reports
      (field_id, supervisor_id, crop_id, crop_task_id, quantity, unit, harvest_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        field_id,
        supervisorId,
        crop_id,
        crop_task_id,
        quantity,
        unit,
        harvest_date
      ]
    );

    return res.status(201).json({
      success: true,
      harvest_id: result.insertId
    });

  } catch (err) {
    console.error("HARVEST ERROR:", err);
    return res.status(500).json({ message: err.message });
  }
};

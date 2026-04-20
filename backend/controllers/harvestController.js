import { db } from "../config/db.js";

export const addHarvest = async (req, res) => {
  try {
    const supervisor_id = req.user?.id;

    // Auth check
    if (!supervisor_id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user"
      });
    }

    const { field_id, quantity, unit, harvest_date } = req.body;

    // Validate input
    if (!field_id || !quantity || !unit || !harvest_date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        required: ["field_id", "quantity", "unit", "harvest_date"],
        received: req.body
      });
    }

    // Get crop_id from fields table
    const [fieldRows] = await db.query(
      `SELECT crop_id FROM fields WHERE field_id = ? LIMIT 1`,
      [field_id]
    );

    if (fieldRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Field not found",
        field_id
      });
    }

    const crop_id = fieldRows[0].crop_id;

    // Get harvesting task
    const [taskRows] = await db.query(
      `SELECT ct.crop_task_id
       FROM crop_tasks ct
       INNER JOIN tasks t ON t.task_id = ct.task_id
       WHERE ct.crop_id = ?
       AND t.task_name = 'Harvesting'
       LIMIT 1`,
      [crop_id]
    );

    if (taskRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No harvesting task found for this crop",
        crop_id
      });
    }

    const crop_task_id = taskRows[0].crop_task_id;

    // Insert harvest report
    const [result] = await db.query(
      `INSERT INTO harvest_reports
        (field_id, supervisor_id, crop_id, crop_task_id, quantity, unit, harvest_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        field_id,
        supervisor_id,
        crop_id,
        crop_task_id,
        parseFloat(quantity),
        unit,
        harvest_date
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Harvest added successfully",
      harvest_id: result.insertId
    });

  } catch (err) {
    console.error("HARVEST ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message
    });
  }
};
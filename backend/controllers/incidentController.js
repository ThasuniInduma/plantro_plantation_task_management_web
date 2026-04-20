import { db } from "../config/db.js";

export const createIncident = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let { field_id, title, description, incident_type, severity } = req.body;

    field_id = Number(field_id);

    if (!field_id || !title || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const allowedTypes = [
      'safety',
      'equipment_damage',
      'weather_issue',
      'theft',
      'other'
    ];

    const allowedSeverity = [
      'low',
      'medium',
      'high',
      'critical'
    ];

    // validate input
    incident_type = (incident_type || '').toLowerCase().trim();
    severity = (severity || '').toLowerCase().trim();

    // validate 
    if (!allowedTypes.includes(incident_type)) {
      incident_type = 'other';
    }

    if (!allowedSeverity.includes(severity)) {
      severity = 'low';
    }

    // get supervisor
    const [sup] = await db.query(
      "SELECT user_id FROM supervisors WHERE field_id = ?",
      [field_id]
    );

    const supervisor_id = sup?.[0]?.user_id || null;

    // insert incident
    const [result] = await db.query(
      `INSERT INTO incident_reports 
      (reporter_id, field_id, supervisor_id, title, description, incident_type, severity)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        field_id,
        supervisor_id,
        title,
        description,
        incident_type,
        severity
      ]
    );

    // notify supervisor
    if (supervisor_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_id)
         VALUES (?, ?, ?, 'incident_report', ?)`,
        [
          supervisor_id,
          "New Incident Report",
          `New incident: ${title}`,
          result.insertId
        ]
      );
    }

    // notify admins
    const [admins] = await db.query(
      "SELECT user_id FROM users WHERE role_id = 1"
    );

    if (admins?.length > 0) {
      for (let admin of admins) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_id)
           VALUES (?, ?, ?, 'incident_report', ?)`,
          [
            admin.user_id,
            "Incident Report Submitted",
            `Worker reported: ${title}`,
            result.insertId
          ]
        );
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("🔥 INCIDENT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

//get incidents relevent to supervisor
export const getSupervisorIncidents = async (req, res) => {
  try {
    const supervisorId = req.user?.id;

    const [rows] = await db.query(
      `SELECT 
        ir.report_id,
        ir.title,
        ir.description,
        ir.incident_type,
        ir.severity,
        ir.status,
        ir.created_at,
        f.field_name,
        u.full_name AS reporter_name
       FROM incident_reports ir
       JOIN fields f ON ir.field_id = f.field_id
       JOIN users u ON ir.reporter_id = u.user_id
       WHERE ir.supervisor_id = ?
       ORDER BY ir.created_at DESC`,
      [supervisorId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// update incident status
export const updateIncidentStatus = async (req, res) => {
  try {
    const supervisorId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "in_progress", "resolved"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // ensure supervisor owns this incident
    const [incident] = await db.query(
      "SELECT supervisor_id FROM incident_reports WHERE report_id = ?",
      [id]
    );

    if (!incident.length) {
      return res.status(404).json({ message: "Incident not found" });
    }

    if (incident[0].supervisor_id !== supervisorId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await db.query(
      "UPDATE incident_reports SET status = ? WHERE report_id = ?",
      [status, id]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// get sncidents
export const getMyIncidents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [rows] = await db.query(
      `SELECT 
        ir.report_id,
        ir.title,
        ir.description,
        ir.incident_type,
        ir.severity,
        ir.status,
        ir.created_at,
        f.field_name
       FROM incident_reports ir
       JOIN fields f ON ir.field_id = f.field_id
       WHERE ir.reporter_id = ?
       ORDER BY ir.created_at DESC`,
      [userId]
    );

    res.json({ success: true, reports: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
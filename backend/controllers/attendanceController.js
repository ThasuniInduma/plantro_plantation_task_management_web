import { db } from "../config/db.js";

// ✅ Supervisor / Owner marking
export const markAttendance = async (req, res) => {
  const { date, records, mode } = req.body;
  const userId = req.user.id; // ✅ FIXED: was req.userId

  try {
    const method = mode === "remote" ? "system" : "manual";

    const values = Object.entries(records).map(([workerId, r]) => [
      workerId,
      date,
      r.status,
      r.checkInTime || null,
      r.checkOutTime || null,
      userId,
      method
    ]);

    if (values.length === 0) {
      return res.status(400).json({ message: "No attendance data" });
    }

    await db.query(
      `INSERT INTO attendance 
        (worker_id, date, status, check_in, check_out, marked_by, method)
       VALUES ?
       ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        check_in = VALUES(check_in),
        check_out = VALUES(check_out),
        marked_by = VALUES(marked_by),
        method = VALUES(method)`,
      [values]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("markAttendance error:", err);
    res.status(500).json({ success: false });
  }
};

// ✅ Get attendance for UI
export const getAttendanceByDate = async (req, res) => {
  const { date } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         a.worker_id,
         a.date,
         a.status,
         a.check_in,
         a.check_out,
         a.method,
         u.full_name
       FROM attendance a
       JOIN workers w ON a.worker_id = w.worker_id
       JOIN users u ON w.user_id = u.user_id
       WHERE a.date = ?`,
      [date]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getAttendanceByDate error:", err);
    res.status(500).json({ success: false });
  }
};

// ✅ Worker self check-in
export const selfCheckIn = async (req, res) => {
  const userId = req.user.id; // ✅ FIXED: was req.userId
  const today = new Date().toISOString().split("T")[0];

  try {
    const [[worker]] = await db.query(
      "SELECT worker_id FROM workers WHERE user_id = ?",
      [userId]
    );

    if (!worker) {
      return res.status(400).json({ message: "Not a worker" });
    }

    const time = new Date().toTimeString().slice(0, 8);

    await db.query(
      `INSERT INTO attendance 
      (worker_id, date, status, check_in, marked_by, method)
      VALUES (?, ?, 'present', ?, ?, 'self')
      ON DUPLICATE KEY UPDATE
      check_in = VALUES(check_in)`,
      [worker.worker_id, today, time, userId]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
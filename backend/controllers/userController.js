import { db } from "../config/db.js";

export const getUser = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id, role_id, full_name, email, phone, status, created_at FROM users WHERE user_id=?", [req.userId]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error("Get User Error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

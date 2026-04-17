import { db } from "../config/db.js";
import { transporter } from "../config/mailer.js";

// ── Create notification (internal helper) ──────────────────────────────────
export const createNotification = async (userId, title, message, type = 'task_assigned', referenceId = null) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type, reference_id)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, referenceId]
    );
  } catch (err) {
    console.error('createNotification error:', err);
  }
};

// ── Send email (internal helper) ───────────────────────────────────────────
export const sendTaskEmail = async (toEmail, toName, subject, htmlBody) => {
  try {
    await transporter.sendMail({
      from: `"Plantro Farm" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    });
  } catch (err) {
    console.error('sendTaskEmail error:', err);
  }
};

// ── GET /api/notifications ─────────────────────────────────────────────────
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const [rows] = await db.query(
      `SELECT * FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/:id/read ───────────────────────────────────────
export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?`,
      [id, req.user?.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── PUT /api/notifications/read-all ──────────────────────────────────────
export const markAllRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [req.user?.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { transporter } from "../config/mailer.js";

/* =========================
   REGISTER
   ========================= */
export const register = async (req, res) => {
  const { name, email, phone, password } = req.body;

  try {
    const [existing] = await db.query(
      "SELECT email FROM users WHERE email=? UNION SELECT email FROM temp_users WHERE email=?",
      [email, email]
    );

    if (existing.length) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = Date.now() + 10 * 60 * 1000;
    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO temp_users 
       (full_name, email, phone, password, verify_otp, verify_otp_expire) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, phone, hash, otp, expire]
    );

    await transporter.sendMail({
      from: `"Plantro Team" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "Verify your Plantro account",
      html: `<p>Hello ${name},</p>
             <p>Your OTP is <b>${otp}</b></p>
             <p>Expires in 10 minutes</p>`
    });

    res.json({ success: true, message: "OTP sent to email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   VERIFY ACCOUNT
   ========================= */
export const verifyAccount = async (req, res) => {
  const { otp, role } = req.body; // role can be ADMIN, SUPERVISOR, WORKER

  try {
    const [rows] = await db.query(
      "SELECT * FROM temp_users WHERE verify_otp=? AND verify_otp_expire>?",
      [otp, Date.now()]
    );

    if (!rows.length)
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });

    const user = rows[0];

    const roleName = role?.toUpperCase() || 'WORKER'; // default WORKER

    await db.query(
      `INSERT INTO users (role_id, full_name, email, phone, password)
       SELECT role_id, ?, ?, ?, ? FROM roles WHERE role_name=?`,
      [user.full_name, user.email, user.phone, user.password, roleName]
    );

    await db.query("DELETE FROM temp_users WHERE user_id=?", [user.user_id]);

    res.json({ success: true, message: `Account verified successfully as ${roleName}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   RESEND OTP
   ========================= */
export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM temp_users WHERE email=?",
      [email]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "No pending verification" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = Date.now() + 10 * 60 * 1000;

    await db.query(
      "UPDATE temp_users SET verify_otp=?, verify_otp_expire=? WHERE email=?",
      [otp, expire, email]
    );

    await transporter.sendMail({
      from: `"Plantro Team" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "New OTP",
      html: `<p>Your new OTP is <b>${otp}</b></p>`
    });

    res.json({ success: true, message: "OTP resent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   LOGIN
   ========================= */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT u.*, r.role_name FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.email=?`,
      [email]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,              // REQUIRED on localhost
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   GET USER (Protected)
   ========================= */
export const getUser = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE user_id=?",
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const { password, ...safeUser } = rows[0];
    res.json({ success: true, user: safeUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   SEND RESET OTP
   ========================= */
export const sendResetOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db.query("SELECT email FROM users WHERE email=?", [email]);
    if (!users.length) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expire = Date.now() + 10 * 60 * 1000;

    await db.query(
      `INSERT INTO reset_otps (email, otp, expire)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp=?, expire=?`,
      [email, otp, expire, otp, expire]
    );

    await transporter.sendMail({
      from: `"Plantro Team" <${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your reset OTP is <b>${otp}</b></p>`
    });

    res.json({ success: true, message: "OTP sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================
   RESET PASSWORD
   ========================= */
export const resetPassword = async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM reset_otps WHERE email=? AND otp=? AND expire>?",
      [email, otp, Date.now()]
    );

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE users SET password=? WHERE email=?",
      [hash, email]
    );

    await db.query(
      "DELETE FROM reset_otps WHERE email=?",
      [email]
    );

    res.json({ success: true, message: "Password reset successful" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

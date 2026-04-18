import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // From cookie
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // From header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 Fetch role from DB
    const [rows] = await db.query(
      `SELECT u.user_id, u.full_name, r.role_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [decoded.id]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: rows[0].user_id,
      name: rows[0].full_name,
      role_name: rows[0].role_name.toLowerCase()
    };

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
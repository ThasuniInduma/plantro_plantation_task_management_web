import jwt from "jsonwebtoken";
import { db } from "../config/db.js";

export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // ✅ Bearer token FIRST (highest priority)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ Cookie ONLY as fallback
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.query(
      `SELECT u.user_id, u.role_id, u.full_name, r.role_name
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
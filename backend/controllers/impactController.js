import { db } from "../config/db.js";

export const getAllImpacts = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT*FROM impact`);
    res.json(rows);
  } catch (err) {
    console.error("getAllFields error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
import { db } from "../config/db.js";

export const getCrops = async (req, res) => {

  try {

    const sql = "SELECT * FROM crops";

    const [rows] = await db.query(sql);

    res.json(rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Database error" });

  }

};

export const addCrop = async (req, res) => {

  try {

    const { name, description } = req.body;

    const sql =
      "INSERT INTO crops (crop_name, description) VALUES (?, ?)";

    const [result] = await db.query(sql, [name, description]);

    res.status(201).json({
      id: result.insertId,
      name,
      description
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Database error" });

  }

};


// DELETE crop
export const deleteCrop = (req, res) => {

  const sql = "DELETE FROM crops WHERE crop_id=?";

  db.query(sql, [req.params.id], (err) => {

    if (err) return res.status(500).json(err);

    res.json({ message: "Crop deleted" });

  });

};

export const updateCrop = async (req, res) => {
  try {
    const { name, description } = req.body;
    const sql = "UPDATE crops SET crop_name=?, description=? WHERE crop_id=?";
    await db.query(sql, [name, description, req.params.id]);
    res.json({ message: "Crop updated", id: req.params.id, name, description });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// GET fields by crop_id
export const getFieldsByCrop = async (req, res) => {
  try {
    const sql = `
      SELECT f.*, u.full_name AS supervisor_name
      FROM fields f
      LEFT JOIN supervisors s ON f.supervisor_id = s.supervisor_id
      LEFT JOIN users u ON s.user_id = u.user_id
      WHERE f.crop_id = ?
    `;
    const [rows] = await db.query(sql, [req.params.cropId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
import { db } from "../config/db.js";

export const getTasksByCrop = (req, res) => {

  const sql = "SELECT * FROM tasks WHERE crop_id=?";

  db.query(sql, [req.params.cropId], (err, result) => {

    if (err) return res.status(500).json(err);

    const tasks = result.map(t => ({
      id: t.task_id,
      name: t.task_name,
      description: t.description,
      frequency: t.frequency_days,
      manHours: t.estimated_hours
    }));

    res.json(tasks);

  });

};

export const addTask = (req, res) => {

  const { name, description, frequency, manHours, cropId } = req.body;

  const sql =
    `INSERT INTO tasks
    (crop_id, task_name, description, frequency_days, estimated_hours)
    VALUES (?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [cropId, name, description, frequency, manHours],
    (err, result) => {

      if (err) return res.status(500).json(err);

      res.json({
        id: result.insertId,
        name,
        description,
        frequency,
        manHours
      });

    }
  );

};

export const deleteTask = (req, res) => {

  const sql = "DELETE FROM tasks WHERE task_id=?";

  db.query(sql, [req.params.id], (err) => {

    if (err) return res.status(500).json(err);

    res.json({ message: "Task deleted" });

  });

};
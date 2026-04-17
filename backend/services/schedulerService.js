import { db } from "../config/db.js";

export const generateSchedules = async () => {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    console.log("Running scheduler...");

    // 1. Get all fields with crops
    const [fields] = await conn.query(`
      SELECT field_id, crop_id
      FROM fields
    `);

    for (const field of fields) {
      const { field_id, crop_id } = field;

      // 2. Get all tasks for this crop
      const [cropTasks] = await conn.query(`
        SELECT *
        FROM crop_tasks
        WHERE crop_id = ?
      `, [crop_id]);

      for (const task of cropTasks) {

        // 3. Check if schedule already exists
        const [existing] = await conn.query(`
          SELECT schedule_id
          FROM field_task_schedule
          WHERE field_id = ? AND task_id = ?
        `, [field_id, task.task_id]);

        // 4. If NOT exists → create it
        if (existing.length === 0) {

          const today = new Date();
          const nextDue = new Date();

          nextDue.setDate(today.getDate() + task.frequency_days);

          await conn.query(`
            INSERT INTO field_task_schedule
              (field_id, task_id, crop_task_id, last_done_date, next_due_date)
            VALUES (?, ?, ?, NULL, ?)
          `, [
            field_id,
            task.task_id,
            task.crop_task_id,
            nextDue.toISOString().split("T")[0]
          ]);

          console.log(`Created schedule → Field ${field_id}, Task ${task.task_id}`);
        }
      }
    }

    await conn.commit();
    console.log("Scheduler completed");

  } catch (err) {
    await conn.rollback();
    console.error("Scheduler error:", err);
  } finally {
    conn.release();
  }
};
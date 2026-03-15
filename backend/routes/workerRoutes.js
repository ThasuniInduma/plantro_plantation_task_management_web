import express from "express";

import {
  getWorkerTasks,
  updateTaskStatus,
  markAttendance
} from "../controllers/workerController.js";

const router = express.Router();

router.get("/tasks/:workerId", getWorkerTasks);

router.put("/tasks/:assignmentId/status", updateTaskStatus);

router.post("/attendance", markAttendance);

export default router;
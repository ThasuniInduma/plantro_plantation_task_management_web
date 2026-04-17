import express from "express";
import {
  getWorkerTasks,
  updateTaskStatus,
  postponeTask,
  markAttendance,
  getAttendanceStatus,
  getAllWorkers,
  getWorkersForSupervisor
} from "../controllers/workerController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);
router.get("/workers", getAllWorkers);
router.get("/my-workers", getWorkersForSupervisor);
// TASKS
router.get("/tasks", getWorkerTasks);
router.put("/tasks/:assignmentId/status", updateTaskStatus);
router.post("/tasks/:taskId/postpone", postponeTask);

// ATTENDANCE
router.post("/attendance", markAttendance);
router.get("/attendance", getAttendanceStatus);

export default router;
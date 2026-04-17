import express from "express";
import {
  getTodaySchedule,
  getUpcomingSchedule,
  assignWorkerToScheduledTask,
  workerMarkComplete,
  supervisorVerify,
  dismissTask,
  getWorkersForSchedule,
  getWorkerTasks
} from "../controllers/scheduleController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/today", authenticate, getTodaySchedule);
router.get("/upcoming", authenticate, getUpcomingSchedule);
router.get("/workers-available", authenticate, getWorkersForSchedule);
router.get("/worker-tasks", authenticate, getWorkerTasks);

router.post("/assign", authenticate, assignWorkerToScheduledTask);
router.post("/worker-complete", authenticate, workerMarkComplete);
router.post("/verify", authenticate, supervisorVerify);
router.post("/dismiss", authenticate, dismissTask);

export default router;
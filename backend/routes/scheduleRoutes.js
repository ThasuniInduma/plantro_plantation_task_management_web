import express from "express";
import {
  getTodaySchedule,
  getUpcomingSchedule,
  getScheduleByDate,
  assignWorkerToScheduledTask,
  unassignWorker,
  updateAssignmentStatus,
  pauseTask,
  workerMarkComplete,
  supervisorVerify,
  dismissTask,
  getWorkersForSchedule,
} from "../controllers/scheduleController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/today", authenticate, getTodaySchedule);
router.get("/upcoming", authenticate, getUpcomingSchedule);
router.get("/by-date", authenticate, getScheduleByDate);
router.get("/workers-available", authenticate, getWorkersForSchedule);

router.post("/assign", authenticate, assignWorkerToScheduledTask);
router.post("/unassign", authenticate, unassignWorker);
router.post("/update-status", authenticate, updateAssignmentStatus);
router.post("/pause", authenticate, pauseTask);
router.post("/worker-complete", authenticate, workerMarkComplete);
router.post("/verify", authenticate, supervisorVerify);
router.post("/dismiss", authenticate, dismissTask);

export default router;
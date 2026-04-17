import express from "express";
import {
  getTasksForDate,
  getAvailableWorkers,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getCalendarDots
} from "../controllers/taskAssignmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/calendar", authenticate, getCalendarDots);
router.get("/workers", authenticate, getAvailableWorkers);
router.get("/", authenticate, getTasksForDate);

router.post("/", authenticate, createAssignment);
router.put("/:id", authenticate, updateAssignment);
router.delete("/:id", authenticate, deleteAssignment);

export default router;
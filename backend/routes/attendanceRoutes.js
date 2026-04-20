import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authenticate, markAttendance);
router.get("/:date", authenticate, getAttendanceByDate);

export default router;
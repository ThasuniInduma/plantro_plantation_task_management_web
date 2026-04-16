import express from "express";
import {
  markAttendance,
  getAttendanceByDate,
  selfCheckIn
} from "../controllers/attendanceController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.post("/", authenticate, markAttendance);
router.get("/:date", authenticate, getAttendanceByDate);
router.post("/self-checkin", authenticate, selfCheckIn);

export default router;
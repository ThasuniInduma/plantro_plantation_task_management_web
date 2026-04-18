import express from "express";
import {
  getWorkerTasks,
  updateTaskStatus,
  postponeTask,
  markAttendance,
  getAttendanceStatus,
  getAllWorkers,
  getWorkersForSupervisor,
  getWorkerProfile,        // ← add
  updateWorkerProfile,     // ← add
} from "../controllers/workerController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/authorize.js";

const router = express.Router();

router.use(authenticate);

// Admin / Supervisor
router.get("/workers",    authorize("admin", "supervisor"), getAllWorkers);
router.get("/my-workers", authorize("supervisor"),          getWorkersForSupervisor);

// Worker profile  ← add these two
router.get("/profile", authorize("worker"), getWorkerProfile);
router.put("/profile", authorize("worker"), updateWorkerProfile);

// Worker tasks
router.get("/tasks",                        authorize("worker"), getWorkerTasks);
router.put("/tasks/:assignmentId/status",   authorize("worker"), updateTaskStatus);
router.post("/tasks/:taskId/postpone",      authorize("worker"), postponeTask);

// Worker attendance
router.post("/attendance", authorize("worker"), markAttendance);
router.get("/attendance",  authorize("worker"), getAttendanceStatus);

export default router;
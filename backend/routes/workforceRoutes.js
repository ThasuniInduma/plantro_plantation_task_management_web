import express from "express";
import {
  getAllWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  toggleWorkerStatus,
  toggleAvailability,
  changeWorkerRole,
  assignTask,
  getAllTasks,
  getAllFields,
  getWorkerTaskHistory,
} from "../controllers/workforceController.js";
import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

// All workforce routes require authentication
router.use(authenticate);

// ── Workers CRUD ──────────────────────────────
router.get("/workers", getAllWorkers);
router.get("/workers/:userId", getWorkerById);
router.post("/workers", createWorker);
router.put("/workers/:userId", updateWorker);
router.delete("/workers/:userId", deleteWorker);

// ── Status & Availability ─────────────────────
router.put("/workers/:userId/status", toggleWorkerStatus);
router.put("/workers/:userId/role", changeWorkerRole);
router.put("/workers/:workerId/availability", toggleAvailability);

// ── Task Assignment ───────────────────────────
router.post("/assign-task", assignTask);
router.get("/workers/:workerId/tasks", getWorkerTaskHistory);

// ── Dropdowns ────────────────────────────────
router.get("/tasks", getAllTasks);
router.get("/fields", getAllFields);

export default router;
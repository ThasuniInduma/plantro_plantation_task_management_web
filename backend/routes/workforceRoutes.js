import express from "express";
import {
  getAllWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  updateWorkerStatus,
  promoteWorkerToSupervisor,
  updateSupervisorField,
  updateWorkerAvailability,
  getWorkerTasks,
  getAllTasks,
  getAllFields,
  getUnassignedFields,
  assignTask,
  demoteSupervisorToWorker,
} from "../controllers/workforceController.js";

import { authenticate } from "../middleware/authenticate.js";

const router = express.Router();

router.use(authenticate);

/* ── Workers ────────────────────────────────────────────── */
router.get("/workers",                      getAllWorkers);
router.post("/workers",                     createWorker);
router.put("/workers/:userId",              updateWorker);
router.delete("/workers/:userId",           deleteWorker);

/* ── Status & availability ───────────────────────────────── */
router.put("/workers/:userId/status",                  updateWorkerStatus);
router.put("/workers/:workerId/availability",           updateWorkerAvailability);

/* ── Role promotion ──────────────────────────────────────── */
router.put("/workers/:userId/promote",      promoteWorkerToSupervisor);
router.put("/workers/:userId/demote",  demoteSupervisorToWorker);


/* ── Supervisor field assignment ─────────────────────────── */
router.put("/supervisors/:userId/field",    updateSupervisorField);

/* ── Task history ────────────────────────────────────────── */
router.get("/workers/:workerId/tasks",      getWorkerTasks);

/* ── Dropdowns ───────────────────────────────────────────── */
router.get("/tasks",                        getAllTasks);
router.get("/fields",                       getAllFields);
router.get("/fields/unassigned",            getUnassignedFields);

/* ── Task assignment ─────────────────────────────────────── */
router.post("/assign-task",                 assignTask);

export default router;
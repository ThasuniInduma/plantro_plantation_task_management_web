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

import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/workers",                      getAllWorkers);
router.post("/workers",                     createWorker);
router.put("/workers/:userId",              updateWorker);
router.delete("/workers/:userId",           deleteWorker);

router.put("/workers/:userId/status",                  updateWorkerStatus);
router.put("/workers/:workerId/availability",           updateWorkerAvailability);

router.put("/workers/:userId/promote",      promoteWorkerToSupervisor);
router.put("/workers/:userId/demote",  demoteSupervisorToWorker);


router.put("/supervisors/:userId/field",    updateSupervisorField);

router.get("/workers/:workerId/tasks",      getWorkerTasks);

router.get("/tasks",                        getAllTasks);
router.get("/fields",                       getAllFields);
router.get("/fields/unassigned",            getUnassignedFields);

router.post("/assign-task",                 assignTask);

export default router;
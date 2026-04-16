import express from "express";
import {
  getAllFields,
  getFieldById,
  createField,
  updateField,
  deleteField,
  getSupervisors,
  getFieldTasks,
  getWorkers,
  assignTask,
  removeSupervisorFromField,
} from "../controllers/fieldController.js";

const router = express.Router();

// IMPORTANT: static routes before /:id
router.get("/supervisors", getSupervisors);
router.get("/workers",     getWorkers);
router.get("/",            getAllFields);
router.get("/:id",         getFieldById);
router.get("/:id/tasks",   getFieldTasks);
router.post("/",           createField);
router.post("/:id/assign", assignTask);
router.put("/:id",         updateField);
router.delete("/:id",      deleteField);
router.put("/:field_id/remove-supervisor", removeSupervisorFromField);

export default router;
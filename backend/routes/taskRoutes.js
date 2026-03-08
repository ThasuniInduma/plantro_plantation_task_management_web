import express from "express";
import { getTasksByCrop, addTask, updateTask, deleteTask } from "../controllers/taskController.js";

const router = express.Router();

router.get("/crop/:cropId", getTasksByCrop);
router.post("/", addTask);
router.put("/:taskId", updateTask);
router.delete("/:taskId", deleteTask);

export default router;
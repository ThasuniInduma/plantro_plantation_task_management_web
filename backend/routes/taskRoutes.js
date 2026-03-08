import express from "express";

import {
  getTasksByCrop,
  addTask,
  deleteTask
} from "../controllers/taskController.js";

const router = express.Router();

router.get("/:cropId", getTasksByCrop);
router.post("/", addTask);
router.delete("/:id", deleteTask);

export default router;
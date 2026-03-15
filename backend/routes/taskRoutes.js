import express from "express";
import {
  getAllTasks,
  getCropTasks,
  addCropTask,
  updateCropTask,
  deleteCropTask
} from "../controllers/taskController.js";

const router = express.Router();

router.get("/all",            getAllTasks);
router.get("/crop/:cropId",   getCropTasks);
router.post("/",              addCropTask);
router.put("/:cropTaskId",    updateCropTask);
router.delete("/:cropTaskId", deleteCropTask);

export default router;
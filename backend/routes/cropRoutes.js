import express from "express";

import {
  getCrops,
  addCrop,
  deleteCrop,
  updateCrop
} from "../controllers/cropController.js";

const router = express.Router();

router.get("/", getCrops);
router.post("/", addCrop);
router.delete("/:id", deleteCrop);
router.put("/:id", updateCrop);

export default router;
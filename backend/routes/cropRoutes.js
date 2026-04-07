import express from "express";

import {
  getCrops,
  addCrop,
  deleteCrop,
  updateCrop,
  getFieldsByCrop 
} from "../controllers/cropController.js";

const router = express.Router();

router.get("/:cropId/fields", getFieldsByCrop);
router.get("/", getCrops);
router.post("/", addCrop);
router.delete("/:id", deleteCrop);
router.put("/:id", updateCrop);

export default router;
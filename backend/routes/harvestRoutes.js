import express from "express";
import { addHarvest } from "../controllers/harvestController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authenticate, addHarvest);

export default router;
import express from "express";
import {
  getAllImpacts
} from "../controllers/impactController.js";

const router = express.Router();

router.get("/", getAllImpacts);


export default router;
import express from "express";
import { createIncident, getSupervisorIncidents } from "../controllers/incidentController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE INCIDENT (worker) */
router.post("/", authenticate, createIncident);

/* GET INCIDENTS (supervisor) */
router.get("/", authenticate, getSupervisorIncidents);

export default router;
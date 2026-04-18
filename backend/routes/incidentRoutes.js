import express from "express";
import { createIncident, getSupervisorIncidents, updateIncidentStatus } from "../controllers/incidentController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE INCIDENT (worker) */
router.post("/", authenticate, createIncident);

/* GET INCIDENTS (supervisor) */
router.get("/", authenticate, getSupervisorIncidents);
router.put("/:id/status", authenticate, updateIncidentStatus);

export default router;
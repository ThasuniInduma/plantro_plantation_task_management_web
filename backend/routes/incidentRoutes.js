import express from "express";
import { createIncident, getSupervisorIncidents, updateIncidentStatus, getMyIncidents } from "../controllers/incidentController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CREATE INCIDENT (worker) */
router.post("/", authenticate, createIncident);

/* GET INCIDENTS (supervisor) */
router.get("/", authenticate, getSupervisorIncidents);
router.put("/:id/status", authenticate, updateIncidentStatus);
router.get('/my', authenticate, getMyIncidents);

export default router;
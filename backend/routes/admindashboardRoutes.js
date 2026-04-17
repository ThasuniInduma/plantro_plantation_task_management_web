import express from "express";
import {
  getDashboardStats,
  getFieldActivity,
  getNotifications,
  markNotificationsRead,
  getFieldDetail,
} from "../controllers/admindashboardController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/stats", getDashboardStats);
router.get("/fields", getFieldActivity);
router.get("/fields/:fieldId", getFieldDetail);
router.get("/notifications", getNotifications);
router.put("/notifications/read", markNotificationsRead);

export default router;
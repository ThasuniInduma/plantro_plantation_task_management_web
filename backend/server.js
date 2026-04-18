import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import cropRoutes from "./routes/cropRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import fieldRoutes from "./routes/fieldRoutes.js";
import workerRoutes from "./routes/workerRoutes.js";
import assignmentRoutes from "./routes/taskAssignmentRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import workforceRoutes from "./routes/workforceRoutes.js";   // ← ADD THIS
import cron from "node-cron";
import { generateSchedules } from "./services/schedulerService.js";
import adminDashboardRoutes from "./routes/admindashboardRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import harvestRoutes from "./routes/harvestRoutes.js";
import { db } from "./config/db.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/fields", fieldRoutes);
app.use("/api/worker", workerRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/workforce", workforceRoutes);                 
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/harvest", harvestRoutes);
generateSchedules();

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily scheduler...");
  await generateSchedules();
});

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
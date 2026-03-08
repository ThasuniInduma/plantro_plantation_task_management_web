import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import cropRoutes from "./routes/cropRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import fieldRoutes from "./routes/fieldRoutes.js";
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

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));

import express from "express";
import {
  getAllFields,
  getFieldById,
  createField,
  updateField,
  deleteField,
  getSupervisors
} from "../controllers/fieldController.js";

const router = express.Router();

// Must be declared before /:fieldId to avoid collision
router.get("/supervisors", getSupervisors);

router.get("/",            getAllFields);
router.get("/:fieldId",    getFieldById);
router.post("/",           createField);
router.put("/:fieldId",    updateField);
router.delete("/:fieldId", deleteField);

export default router;
import express from "express";
import {
  register,
  verifyAccount,
  resendOTP,
  login,
  getUser,
  sendResetOTP,
  resetPassword
} from "../controllers/authController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify-account", verifyAccount);
router.post("/resend-otp", resendOTP);
router.post("/login", login);
router.post("/logout", (req, res) => {
  res.clearCookie("token", { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });
  return res.json({ success: true, message: "Logged out" });
});

router.get("/user", authenticate, getUser); 

router.post("/send-reset-otp", sendResetOTP);
router.post("/reset-password", resetPassword);

export default router;

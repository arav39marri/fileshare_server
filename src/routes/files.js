import express from "express";

import { Otp } from "../models/Otp.js";
import { File } from "../models/File.js";
import { isValidOtp } from "../utils/otp.js";

const router = express.Router();

router.get("/:otp", async (req, res, next) => {
  try {
    const otp = String(req.params.otp || "");
    if (!isValidOtp(otp)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const otpDoc = await Otp.findOne({ otp }).lean();
    if (!otpDoc) {
      return res.status(404).json({ error: "OTP not found" });
    }

    if (otpDoc.expiresAt <= new Date()) {
      return res.status(410).json({ error: "OTP expired" });
    }

    const files = await File.find({ otp }).sort({ uploadedAt: -1 }).lean();

    return res.json({
      otp,
      expiresAt: otpDoc.expiresAt,
      files,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

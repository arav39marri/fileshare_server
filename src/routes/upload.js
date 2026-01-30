import express from "express";

import { upload } from "../middleware/multer.js";
import { Otp } from "../models/Otp.js";
import { File } from "../models/File.js";
import { generateOtp, isValidOtp } from "../utils/otp.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

const router = express.Router();

function ttlHours() {
  const hours = process.env.OTP_TTL_HOURS ? Number(process.env.OTP_TTL_HOURS) : 24;
  return Number.isFinite(hours) && hours > 0 ? hours : 24;
}

function computeExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + ttlHours());
  return expiresAt;
}

async function createUniqueOtp() {
  for (let i = 0; i < 10; i++) {
    const otp = generateOtp();
    const exists = await Otp.exists({ otp });
    if (!exists) return otp;
  }
  const err = new Error("Failed to generate OTP");
  err.statusCode = 500;
  throw err;
}

async function handleUploadToOtp({ otp, files }) {
  const otpDoc = await Otp.findOne({ otp });
  if (!otpDoc) {
    const err = new Error("OTP not found");
    err.statusCode = 404;
    throw err;
  }
  if (otpDoc.expiresAt <= new Date()) {
    const err = new Error("OTP expired");
    err.statusCode = 410;
    throw err;
  }

  const folder = `otp_uploads/${otp}`;

  const uploaded = [];
  for (const f of files) {
    const originalName = f.originalname || "file";
    const base = originalName.replace(/\.[^/.]+$/, "");
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${Date.now()}_${safeBase}`;

    const mime = f.mimetype || "";
    const resourceType = mime.startsWith("image/")
      ? "image"
      : mime.startsWith("video/")
        ? "video"
        : "raw";

    const result = await uploadBufferToCloudinary({
      buffer: f.buffer,
      folder,
      filename,
      resourceType,
    });

    const fileDoc = await File.create({
      otp,
      original_filename: originalName,
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at ? new Date(result.created_at) : undefined,
      expiresAt: otpDoc.expiresAt,
    });

    uploaded.push(fileDoc);
  }

  return { otpDoc, uploaded };
}

router.post("/new", upload.array("files", 10), async (req, res, next) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const otp = await createUniqueOtp();
    const expiresAt = computeExpiresAt();

    const otpDoc = await Otp.create({
      otp,
      expiresAt,
    });

    const { uploaded } = await handleUploadToOtp({ otp, files });

    return res.json({
      otp,
      expiresAt: otpDoc.expiresAt,
      files: uploaded,
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/existing",
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      const otp = String(req.body?.otp || "");
      if (!isValidOtp(otp)) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      const files = req.files || [];
      if (files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const { otpDoc, uploaded } = await handleUploadToOtp({ otp, files });

      return res.json({
        otp,
        expiresAt: otpDoc.expiresAt,
        files: uploaded,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

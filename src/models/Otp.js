import mongoose from "mongoose";

const OtpSchema = new mongoose.Schema(
  {
    otp: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

export const Otp = mongoose.model("Otp", OtpSchema);

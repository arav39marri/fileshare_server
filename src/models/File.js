import mongoose from "mongoose";

const FileSchema = new mongoose.Schema(
  {
    otp: { type: String, required: true, index: true },
    original_filename: { type: String, required: true },
    public_id: { type: String, required: true, index: true },
    secure_url: { type: String, required: true },
    resource_type: { type: String, required: true },
    format: { type: String },
    bytes: { type: Number },
    created_at: { type: Date },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
    expiresAt: { type: Date, required: true, index: true },
  },
  { versionKey: false }
);

export const File = mongoose.model("File", FileSchema);

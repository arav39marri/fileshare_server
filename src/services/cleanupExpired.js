import { cloudinary } from "../config/cloudinary.js";
import { Otp } from "../models/Otp.js";
import { File } from "../models/File.js";

export async function cleanupExpired() {
  const now = new Date();

  const expiredOtps = await Otp.find({ expiresAt: { $lte: now } }).lean();
  if (expiredOtps.length === 0) return { deletedOtps: 0, deletedFiles: 0 };

  const otps = expiredOtps.map((o) => o.otp);
  const files = await File.find({ otp: { $in: otps } }).lean();

  const byType = new Map();
  for (const f of files) {
    const type = f.resource_type || "image";
    const arr = byType.get(type) || [];
    arr.push(f.public_id);
    byType.set(type, arr);
  }

  for (const [type, publicIds] of byType.entries()) {
    if (publicIds.length === 0) continue;
    await cloudinary.api.delete_resources(publicIds, { resource_type: type });
  }

  const fileDeleteResult = await File.deleteMany({ otp: { $in: otps } });
  const otpDeleteResult = await Otp.deleteMany({ otp: { $in: otps } });

  return {
    deletedOtps: otpDeleteResult.deletedCount || 0,
    deletedFiles: fileDeleteResult.deletedCount || 0,
  };
}

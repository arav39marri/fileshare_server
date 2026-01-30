import crypto from "crypto";

export function generateOtp() {
  const num = crypto.randomInt(0, 1000000);
  return String(num).padStart(6, "0");
}

export function isValidOtp(otp) {
  return typeof otp === "string" && /^\d{6}$/.test(otp);
}

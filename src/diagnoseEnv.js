import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import util from "util";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

console.log(`Loaded env from: ${envPath}`);

function mask(value) {
  if (!value) return "(missing)";
  const v = String(value);
  if (v.length <= 6) return "(set)";
  return `${v.slice(0, 2)}***${v.slice(-2)}`;
}

function assertPresent(name) {
  const val = process.env[name];
  if (!val || !String(val).trim()) {
    const err = new Error(`${name} is missing`);
    err.code = "ENV_MISSING";
    throw err;
  }
}

async function checkMongo() {
  const mongoose = await import("mongoose").then((m) => m.default || m);
  const { connectDb } = await import("./config/db.js");

  const uri = process.env.MONGODB_URI;
  console.log(`Mongo: MONGODB_URI=${uri ? "(set)" : "(missing)"}`);

  await connectDb();
  await mongoose.connection.db.admin().ping();
  await mongoose.disconnect();

  console.log("Mongo: OK");
}

async function checkCloudinary() {
  const { cloudinary } = await import("./config/cloudinary.js");

  console.log(
    `Cloudinary: cloud_name=${mask(process.env.CLOUDINARY_CLOUD_NAME)} api_key=${mask(
      process.env.CLOUDINARY_API_KEY
    )} api_secret=${process.env.CLOUDINARY_API_SECRET ? "(set)" : "(missing)"}`
  );

  const result = await cloudinary.api.ping();
  if (!result || result.status !== "ok") {
    throw new Error("Cloudinary ping failed");
  }
  console.log("Cloudinary: OK");
}

async function main() {
  assertPresent("MONGODB_URI");
  assertPresent("CLOUDINARY_CLOUD_NAME");
  assertPresent("CLOUDINARY_API_KEY");
  assertPresent("CLOUDINARY_API_SECRET");

  console.log("\n== Credential Diagnostics ==\n");

  await checkMongo();
  await checkCloudinary();

  console.log("\nAll credentials look valid.\n");
  process.exit(0);
}

main().catch((err) => {
  const isObject = err && typeof err === "object";
  const msg = err?.message || (isObject ? undefined : String(err)) || "Unknown error";
  const code = err?.http_code || err?.code || err?.error?.http_code || "UNKNOWN";

  console.error(`\nDiagnostics failed${msg ? `: ${msg}` : ""}`);
  console.error(`Code: ${code}`);
  if (isObject) {
    console.error("Details:");
    console.error(util.inspect(err, { depth: 8, colors: false }));
  }
  process.exit(1);
});

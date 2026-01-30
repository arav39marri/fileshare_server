import "dotenv/config";

import cron from "node-cron";
import app from "./app.js";
import { connectDb } from "./config/db.js";
import { cleanupExpired } from "./services/cleanupExpired.js";

const port = process.env.PORT ? Number(process.env.PORT) : 5000;

try {
  await connectDb();
  console.log("MongoDB: connected");
} catch (err) {
  console.error("MongoDB: connection failed", err);
  process.exit(1);
}

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});

const cleanupSchedule = process.env.CLEANUP_CRON || "*/15 * * * *";
cron.schedule(cleanupSchedule, async () => {
  try {
    await cleanupExpired();
  } catch (err) {
    console.error("Cleanup job failed", err);
  }
});

process.on("SIGINT", async () => {
  server.close(() => process.exit(0));
});

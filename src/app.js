import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { requestId } from "./middleware/requestId.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import uploadRoutes from "./routes/upload.js";
import fileRoutes from "./routes/files.js";
import downloadRoutes from "./routes/download.js";
import cleanupRoutes from "./routes/cleanup.js";

const app = express();

app.use(helmet());
app.use(requestId);

const corsOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const allowedOrigins = corsOrigin
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes("*")) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      const err = new Error("CORS not allowed");
      err.statusCode = 403;
      return cb(err);
    },
    credentials: true,
  })
);

app.use(morgan("dev"));
app.use(express.json());

app.use("/api", apiRateLimiter);
app.use("/api/upload", uploadRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/download", downloadRoutes);
app.use("/api", cleanupRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || err.http_code || 500;
  const errorId = req.id;
  console.error(`errorId=${errorId}`, err);
  res.setHeader("x-error-id", errorId);
  res.status(status).json({
    error: err.message || "Internal Server Error",
    errorId,
  });
});

export default app;

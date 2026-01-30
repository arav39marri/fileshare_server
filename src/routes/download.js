import express from "express";
import { Readable } from "stream";

import { File } from "../models/File.js";

const router = express.Router();

function safeFilename(name) {
  const fallback = "download";
  const str = String(name || fallback);
  return str.replace(/[\r\n"]/g, "_");
}

router.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id || "");

    const file = await File.findById(id).lean();
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.expiresAt && new Date(file.expiresAt) <= new Date()) {
      return res.status(410).json({ error: "File expired" });
    }

    const upstream = await fetch(file.secure_url);
    if (!upstream.ok) {
      const err = new Error(`Upstream fetch failed (${upstream.status})`);
      err.statusCode = 502;
      throw err;
    }

    const filename = safeFilename(file.original_filename);
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    if (!upstream.body) {
      const err = new Error("Upstream body missing");
      err.statusCode = 502;
      throw err;
    }

    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;

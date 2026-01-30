import express from "express";

import { cleanupExpired } from "../services/cleanupExpired.js";

const router = express.Router();

router.delete("/cleanup", async (req, res, next) => {
  try {
    const requiredKey = process.env.CLEANUP_KEY;
    if (requiredKey) {
      const key = req.header("x-cleanup-key");
      if (key !== requiredKey) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const result = await cleanupExpired();
    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;

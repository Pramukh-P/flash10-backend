// flash10-backend/src/routes/news.js
import express from "express";
import https from "https";
import {
  getNews, getNewsById, getCategorySummary,
  summarizeNews, getPersonalizedNews,
} from "../controllers/newsController.js";
import { protect } from "../middleware/auth.js";
import { fetchCategory, fetchAllCategories } from "../jobs/fetchNews.js";

const router = express.Router();

router.get("/", getNews);
router.get("/categories/summary", getCategorySummary);

// Wake-up ping — cron-job.org hits this 10 min before fetch
// Also used by the fetch route to self-check if server is ready
router.get("/admin/ping", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// External cron trigger — waits for server to be fully ready, then fetches
router.get("/admin/fetch-all", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) return res.status(403).json({ error: "Forbidden" });

  // Respond 200 immediately so cron-job.org never sees a timeout/503
  res.json({ ok: true, message: "News fetch started", time: new Date().toISOString() });

  // Small delay to ensure MongoDB is fully connected after cold start
  await new Promise(r => setTimeout(r, 3000));

  // Now fetch all categories in background
  fetchAllCategories().catch((err) =>
    console.error("Background fetch error:", err.message)
  );
});

// Refetch single category
router.get("/admin/refetch/:category", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) return res.status(403).json({ error: "Forbidden" });
  res.json({ ok: true, message: `Fetch started for: ${req.params.category}` });
  fetchCategory(req.params.category).catch((err) =>
    console.error("Background fetch error:", err.message)
  );
});

router.get("/:id", getNewsById);
router.post("/:id/summarize", protect, summarizeNews);
router.get("/feed/for-you", protect, getPersonalizedNews);

export default router;

// flash10-backend/src/routes/news.js
import express from "express";
import {
  getNews, getNewsById, getCategorySummary,
  summarizeNews, getPersonalizedNews,
} from "../controllers/newsController.js";
import { protect } from "../middleware/auth.js";
import { fetchCategory, fetchAllCategories } from "../jobs/fetchNews.js";

const router = express.Router();

router.get("/", getNews);
router.get("/categories/summary", getCategorySummary);

// External cron trigger — called by cron-job.org every 12 hours
router.get("/admin/fetch-all", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) return res.status(403).json({ error: "Forbidden" });
  // Respond immediately (before fetch completes) so cron-job.org gets 200, not timeout
  res.json({ ok: true, message: "News fetch started", time: new Date().toISOString() });
  fetchAllCategories().catch((err) => console.error("Background fetch error:", err.message));
});

// Refetch single category
router.get("/admin/refetch/:category", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) return res.status(403).json({ error: "Forbidden" });
  res.json({ ok: true, message: `Fetch started for: ${req.params.category}` });
  fetchCategory(req.params.category).catch((err) => console.error("Background fetch error:", err.message));
});

router.get("/:id", getNewsById);
router.post("/:id/summarize", protect, summarizeNews);
router.get("/feed/for-you", protect, getPersonalizedNews);

export default router;

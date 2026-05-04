// flash10-backend/src/routes/news.js
import express from "express";
import {
  getNews,
  getNewsById,
  getCategorySummary,
  summarizeNews,
  getPersonalizedNews,
} from "../controllers/newsController.js";
import { protect } from "../middleware/auth.js";
import { fetchCategory, fetchAllCategories } from "../jobs/fetchNews.js";

const router = express.Router();

// Public routes
router.get("/", getNews);
router.get("/categories/summary", getCategorySummary);

// External cron trigger — called by cron-job.org every 12 hours
// GET /news/admin/fetch-all?secret=YOUR_ADMIN_SECRET
router.get("/admin/fetch-all", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // Respond immediately so cron-job.org doesn't time out (fetch takes ~30s)
  res.json({ ok: true, message: "News fetch started", time: new Date().toISOString() });
  // Run fetch in background after response is sent
  fetchAllCategories().catch((err) =>
    console.error("Background fetch error:", err.message)
  );
});

// Refetch a single category
// GET /news/admin/refetch/:category?secret=YOUR_ADMIN_SECRET
router.get("/admin/refetch/:category", async (req, res) => {
  const secret = process.env.ADMIN_SECRET || "flash10secret";
  if (req.query.secret !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json({ ok: true, message: `Fetch started for: ${req.params.category}` });
  fetchCategory(req.params.category).catch((err) =>
    console.error("Background fetch error:", err.message)
  );
});

router.get("/:id", getNewsById);

// Protected routes (login required)
router.post("/:id/summarize", protect, summarizeNews);
router.get("/feed/for-you", protect, getPersonalizedNews);

export default router;

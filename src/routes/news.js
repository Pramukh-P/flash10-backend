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
import { fetchCategory } from "../jobs/fetchNews.js";

const router = express.Router();

// Public routes
router.get("/", getNews);
router.get("/categories/summary", getCategorySummary);

// One-time fix: refetch a specific category (use in browser to fix missing politics)
// Example: GET /news/admin/refetch/politics?secret=flash10secret
router.get("/admin/refetch/:category", async (req, res) => {
  if (req.query.secret !== (process.env.ADMIN_SECRET || "flash10secret")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    await fetchCategory(req.params.category);
    res.json({ ok: true, message: `Fetched category: ${req.params.category}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", getNewsById);

// Protected routes (login required)
router.post("/:id/summarize", protect, summarizeNews);
router.get("/feed/for-you", protect, getPersonalizedNews);

export default router;

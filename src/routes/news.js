// server/src/routes/news.js

import express from "express";
import News from "../models/News.js";

const router = express.Router();

/**
 * GET /news
 * Returns news grouped by dayTag (Today, Yesterday, ..., Day-7)
 */
router.get("/", async (req, res) => {
  try {
    // Get today's date
    const today = new Date();
    const dayNewsMap = {};

    // Loop for last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dayTag = date.toISOString().split("T")[0];

      // Fetch top 20 news for this day
      const newsOfDay = await News.find({ dayTag })
        .sort({ publishedAt: -1 })
        .limit(20)
        .lean(); // lean() gives plain JS objects

      if (newsOfDay.length > 0) {
        const label =
          i === 0
            ? "Today"
            : i === 1
            ? "Yesterday"
            : `Day-${i + 1}`;
        dayNewsMap[label] = newsOfDay;
      }
    }

    res.json(dayNewsMap);
  } catch (err) {
    console.error("❌ Error fetching day-wise news:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /news/:id
 * Returns single news detail by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id).lean();
    if (!newsItem) {
      return res.status(404).json({ error: "News not found" });
    }
    res.json(newsItem);
  } catch (err) {
    console.error("❌ Error fetching news item:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

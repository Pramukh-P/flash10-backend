import express from "express";
import { getNews, getNewsById } from "../controllers/newsController.js";

const router = express.Router();

// Get all news
router.get("/", async (req, res) => {
  try {
    const news = await getNews(); // fetch from MongoDB
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

// Get single news by ID
router.get("/:id", async (req, res) => {
  try {
    const newsItem = await getNewsById(req.params.id);
    if (!newsItem) return res.status(404).json({ error: "News not found" });
    res.json(newsItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;

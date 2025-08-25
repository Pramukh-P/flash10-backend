import express from "express";
import { getNews } from "../controllers/newsController.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const news = await getNews(); // fetch from MongoDB
    res.json(news);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

export default router;

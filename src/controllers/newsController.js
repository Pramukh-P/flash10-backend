// flash10-backend/src/controllers/newsController.js
import News from "../models/News.js";
import axios from "axios";

// GET /news — supports ?category=sports&page=1&limit=20&search=term
export const getNews = async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    const query = {};

    if (category && category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [news, total] = await Promise.all([
      News.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments(query),
    ]);

    res.json({
      news,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
};

// GET /news/:id
export const getNewsById = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ error: "News not found" });
    res.json(newsItem);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch news" });
  }
};

// GET /news/categories/summary — count per category
export const getCategorySummary = async (req, res) => {
  try {
    const summary = await News.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          latest: { $max: "$publishedAt" },
        },
      },
      { $sort: { count: -1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
};

// POST /news/:id/summarize — AI summarizer (protected route)
export const summarizeNews = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ error: "News not found" });

    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    if (!HUGGINGFACE_API_KEY) {
      return res.status(500).json({ error: "HUGGINGFACE_API_KEY not set in environment" });
    }

    const text = (newsItem.content || newsItem.description || newsItem.title || "").slice(0, 1024);

    // Hugging Face Inference API — facebook/bart-large-cnn (free)
    // Use axios({ url }) form to guarantee the full URL is used correctly
    const response = await axios({
      method: "post",
      url: "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      data: {
        inputs: text,
        parameters: { max_length: 150, min_length: 40, do_sample: false },
      },
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 35000,
    });

    // HF returns [{ summary_text: "..." }]
    const summary = response.data?.[0]?.summary_text || "Could not generate summary.";
    res.json({ summary });

  } catch (err) {
    // If model is cold-starting, HF returns 503 with estimated_time
    if (err.response?.status === 503) {
      const wait = err.response.data?.estimated_time || 20;
      return res.status(503).json({
        error: `Model is warming up, retry in ${Math.ceil(wait)} seconds.`,
        retryAfter: Math.ceil(wait),
      });
    }
    // Log clearly so you can debug in Render logs
    console.error(
      "AI summarizer error — status:", err.response?.status,
      "| data:", JSON.stringify(err.response?.data || err.message).slice(0, 300)
    );
    res.status(500).json({ error: "Failed to summarize article" });
  }
};

// GET /news/for-you — personalized feed (protected)
export const getPersonalizedNews = async (req, res) => {
  try {
    const { preferences } = req.user;
    const { page = 1, limit = 20 } = req.query;

    if (!preferences || preferences.length === 0) {
      return res.json({ news: [], total: 0, page: 1, totalPages: 0 });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [news, total] = await Promise.all([
      News.find({ category: { $in: preferences } })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      News.countDocuments({ category: { $in: preferences } }),
    ]);

    res.json({
      news,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch personalized news" });
  }
}

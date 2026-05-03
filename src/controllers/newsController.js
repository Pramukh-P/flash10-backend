// flash10-backend/src/controllers/newsController.js
import News from "../models/News.js";
import https from "https";

// GET /news — supports ?category=sports&page=1&limit=20&search=term
export const getNews = async (req, res) => {
  try {
    const { category, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (category && category !== "all") query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [news, total] = await Promise.all([
      News.find(query).sort({ publishedAt: -1 }).skip(skip).limit(parseInt(limit)),
      News.countDocuments(query),
    ]);
    res.json({ news, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
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

// GET /news/categories/summary
export const getCategorySummary = async (req, res) => {
  try {
    const summary = await News.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, latest: { $max: "$publishedAt" } } },
      { $sort: { count: -1 } },
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: "Failed to get summary" });
  }
};

// Low-level HTTPS POST helper — works on Render, bypasses all proxy issues
function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: "POST", headers: { ...headers, "Content-Length": Buffer.byteLength(payload) } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.setTimeout(35000, () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// POST /news/:id/summarize — AI summarizer (protected route)
// Supports: GROQ_API_KEY (free) or OPENAI_API_KEY (paid, if you have it)
export const summarizeNews = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) return res.status(404).json({ error: "News not found" });

    const text = (newsItem.content || newsItem.description || newsItem.title || "").slice(0, 2000);
    const prompt = `Summarize this news article in 3 clear bullet points. Be concise and factual.\n\nTitle: ${newsItem.title}\n\nContent: ${text}`;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!GROQ_API_KEY && !OPENAI_API_KEY) {
      return res.status(500).json({ error: "No AI API key configured (set GROQ_API_KEY or OPENAI_API_KEY)" });
    }

    let summary = "";

    // ── Groq (free tier, fast) ──────────────────────────────────────
    if (GROQ_API_KEY) {
      console.log("Using Groq for summarization...");
      const { status, body } = await httpsPost(
        "api.groq.com",
        "/openai/v1/chat/completions",
        { "Authorization": "Bearer " + GROQ_API_KEY, "Content-Type": "application/json" },
        {
          model: "llama3-8b-8192",  // free model on Groq
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        }
      );
      console.log("Groq status:", status, "| preview:", body.slice(0, 100));
      if (status === 200) {
        const data = JSON.parse(body);
        summary = data.choices?.[0]?.message?.content || "";
      } else {
        console.error("Groq error:", status, body.slice(0, 300));
        return res.status(500).json({ error: "Failed to summarize article" });
      }
    }

    // ── OpenAI (fallback if no Groq key) ───────────────────────────
    else if (OPENAI_API_KEY) {
      console.log("Using OpenAI for summarization...");
      const { status, body } = await httpsPost(
        "api.openai.com",
        "/v1/chat/completions",
        { "Authorization": "Bearer " + OPENAI_API_KEY, "Content-Type": "application/json" },
        {
          model: "gpt-4o-mini",  // cheapest OpenAI model (~$0.0001 per summary)
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
          temperature: 0.3,
        }
      );
      console.log("OpenAI status:", status, "| preview:", body.slice(0, 100));
      if (status === 200) {
        const data = JSON.parse(body);
        summary = data.choices?.[0]?.message?.content || "";
      } else {
        console.error("OpenAI error:", status, body.slice(0, 300));
        return res.status(500).json({ error: "Failed to summarize article" });
      }
    }

    res.json({ summary: summary || "Could not generate summary." });

  } catch (err) {
    console.error("AI summarizer error:", err.message);
    res.status(500).json({ error: "Failed to summarize article" });
  }
};

// GET /news/feed/for-you — personalized feed (protected)
export const getPersonalizedNews = async (req, res) => {
  try {
    const { preferences } = req.user;
    const { page = 1, limit = 20 } = req.query;
    if (!preferences || preferences.length === 0) {
      return res.json({ news: [], total: 0, page: 1, totalPages: 0 });
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [news, total] = await Promise.all([
      News.find({ category: { $in: preferences } }).sort({ publishedAt: -1 }).skip(skip).limit(parseInt(limit)),
      News.countDocuments({ category: { $in: preferences } }),
    ]);
    res.json({ news, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch personalized news" });
  }
};

// server/src/jobs/fetchNews.js

import axios from "axios";
import cron from "node-cron";
import News from "../models/News.js";

// const API_KEY = process.env.NEWS_API_KEY; // NewsData.io API key

// Helper: get today's date in YYYY-MM-DD format
function todayTag() {
  return new Date().toISOString().split("T")[0];
}

// Function to fetch and save top 20 news
export async function fetchTopNews() {
const API_KEY = process.env.NEWS_API_KEY; // <-- moved here
console.log("📡 Fetching top 20 news for", todayTag());

if (!API_KEY) {
    console.error("❌ NEWS_API_KEY is missing!");
    return;
}

  try {
    const res = await axios.get(
      `https://newsdata.io/api/1/news?apikey=${API_KEY}&country=in&language=en`
    );

    if (!res.data.results || res.data.results.length === 0) {
      console.error("❌ No results returned from NewsData.io");
      return;
    }

    // Take top 20 results
    const newsData = res.data.results.slice(0, 20).map((article) => ({
      title: article.title,
      description: article.description,
      content: article.content || article.description,
      imageUrl: article.image_url || "/public/default.jpg", // fallback image
      url: article.link,
      publishedAt: article.pubDate ? new Date(article.pubDate) : new Date(),
      dayTag: todayTag(),
    }));

    // Save to MongoDB
    await News.insertMany(newsData);
    console.log("✅ News saved for", todayTag());

    // Delete news older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const result = await News.deleteMany({ publishedAt: { $lt: sevenDaysAgo } });
    if (result.deletedCount > 0) {
      console.log(`🗑️ Deleted ${result.deletedCount} news older than 7 days`);
    }
  } catch (err) {
    console.error("❌ Error fetching news:", err.response?.data || err.message);
  }
}

// Schedule cron job: runs every day at 12:05 AM
export function scheduleNewsFetch() {
  cron.schedule("5 0 * * *", async () => {
    await fetchTopNews();
  });
}

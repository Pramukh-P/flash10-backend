// flash10-backend/src/jobs/fetchNews.js
import axios from "axios";
import cron from "node-cron";
import News from "../models/News.js";

// GNews category mapping
// GNews free tier: 100 req/day, 10 articles per request
// Valid GNews topics: general, world, nation, business, technology, entertainment, sports, science, health
const CATEGORY_MAP = {
  general: "general",
  politics: "nation",         // GNews uses "nation" for politics/national news
  sports: "sports",
  entertainment: "entertainment",
  technology: "technology",
  science: "science",
  health: "health",
  business: "business",
  world: "world",
};

// Weather is handled separately (no GNews category for it)
const FETCH_CATEGORIES = Object.keys(CATEGORY_MAP);

function todayTag() {
  return new Date().toISOString().split("T")[0];
}

export async function fetchCategory(category) {
  const API_KEY = process.env.GNEWS_API_KEY;
  if (!API_KEY) {
    console.error("❌ GNEWS_API_KEY is missing!");
    return;
  }

  const gnewsCategory = CATEGORY_MAP[category] || "general";

  try {
    const res = await axios.get("https://gnews.io/api/v4/top-headlines", {
      params: {
        apikey: API_KEY,
        lang: "en",
        country: "in",
        topic: gnewsCategory,
        max: 10,
      },
    });

    if (!res.data.articles || res.data.articles.length === 0) {
      console.warn(`⚠️  No articles for category: ${category}`);
      return;
    }

    const day = todayTag();
    const newsData = res.data.articles.map((article) => ({
      title: article.title,
      description: article.description,
      content: article.content || article.description,
      imageUrl: article.image || "/public/default.jpg",
      url: article.url,
      source: article.source?.name || "Unknown",
      category,
      publishedAt: article.publishedAt ? new Date(article.publishedAt) : new Date(),
      dayTag: day,
      fetchedAt: new Date(),
    }));

    // Use upsert to avoid duplicates (unique URL)
    let saved = 0;
    for (const item of newsData) {
      try {
        await News.findOneAndUpdate(
          { url: item.url },
          { $setOnInsert: item },
          { upsert: true, new: false }
        );
        saved++;
      } catch (e) {
        // Duplicate key - skip silently
      }
    }
    console.log(`✅ [${category}] Saved ${saved} new articles`);
  } catch (err) {
    console.error(
      `❌ Error fetching [${category}]:`,
      err.response?.data?.errors || err.message
    );
  }
}

export async function fetchAllCategories() {
  console.log(`📰 Starting news fetch for all categories — ${todayTag()}`);
  for (const category of FETCH_CATEGORIES) {
    await fetchCategory(category);
    // Small delay to avoid rate-limiting
    await new Promise((r) => setTimeout(r, 500));
  }

  // Clean up articles older than 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const result = await News.deleteMany({ publishedAt: { $lt: sevenDaysAgo } });
  if (result.deletedCount > 0) {
    console.log(`🗑️  Deleted ${result.deletedCount} articles older than 7 days`);
  }

  console.log("✅ All categories fetched!");
}

// Schedule: every 12 hours at 6:00 AM and 6:00 PM IST
export function scheduleNewsFetch() {
  // Runs at 00:30 and 12:30 UTC (6:00 AM and 6:00 PM IST)
  cron.schedule("30 0,12 * * *", async () => {
    console.log("⏰ Cron triggered: 12-hour news fetch");
    await fetchAllCategories();
  });
  console.log("⏰ News fetch scheduled: every 12 hours (6AM & 6PM IST)");
}

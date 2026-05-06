// flash10-backend/src/index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { scheduleNewsFetch, fetchAllCategories } from "./jobs/fetchNews.js";
import { cleanupOldNews } from "./controllers/newsController.js";
import { startKeepAlive } from "./jobs/keepAlive.js";
import newsRoutes from "./routes/news.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();

app.use(cors({
  origin: [FRONTEND_URL, "https://flash10.netlify.app", /\.netlify\.app$/],
  credentials: true,
}));
app.use(express.json());
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/public", express.static(path.join(__dirname, "../../public")));

app.use("/news", newsRoutes);
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Flash10 API v2", timestamp: new Date().toISOString() });
});

mongoose.connect(MONGO_URI).then(async () => {
  console.log("✅ Connected to MongoDB Atlas");

  // Clean up old articles on every wake
  await cleanupOldNews();

  // Start keep-alive to prevent Render from sleeping
  startKeepAlive();

  // Schedule internal cron (backup)
  scheduleNewsFetch();

  // Only fetch if DB is empty
  const { default: News } = await import("./models/News.js");
  const count = await News.countDocuments();
  if (count === 0) {
    console.log("📰 DB is empty, doing initial fetch...");
    await fetchAllCategories();
    console.log("✅ Initial news fetch complete");
  } else {
    console.log(`ℹ️  DB has ${count} articles, skipping initial fetch`);
  }

  app.listen(PORT, () => console.log(`🚀 Flash10 server running on port ${PORT}`));
}).catch((err) => {
  console.error("❌ MongoDB Connection Error:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => { console.error("❌ Unhandled Rejection:", err.message); process.exit(1); });
process.on("uncaughtException", (err) => { console.error("❌ Uncaught Exception:", err.message); process.exit(1); });

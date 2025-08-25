// server/src/index.js

import dotenv from "dotenv";
dotenv.config(); // Must be first to load .env variables

// Debug: check if key is loaded
console.log("🔑 NEWS_API_KEY:", process.env.NEWS_API_KEY);

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import { fetchTopNews, scheduleNewsFetch } from "./jobs/fetchNews.js";
import newsRoutes from "./routes/news.js";

// Connect to MongoDB
connectDB();

// Create Express app
const app = express();

// Middleware
app.use(cors()); // Allow frontend during development
app.use(express.json());
app.use(morgan("dev"));

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (default images, etc.)
app.use("/public", express.static(path.join(__dirname, "../public")));

// Routes
app.use("/news", newsRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Flash20 API",
    timestamp: new Date().toISOString(),
  });
});

// Immediately fetch news once the server starts
fetchTopNews()
  .then(() => console.log("✅ Initial news fetch complete"))
  .catch((err) => console.error("❌ Initial news fetch failed:", err));

// Schedule daily news fetch at 12:05 AM
scheduleNewsFetch();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Flash20 server running on http://localhost:${PORT}`);
});

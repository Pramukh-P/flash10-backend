// server/src/index.js

import dotenv from "dotenv";
dotenv.config(); // Load .env first

import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { fetchTopNews, scheduleNewsFetch } from "./jobs/fetchNews.js";
import newsRoutes from "./routes/news.js";

// Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const NEWS_API_KEY = process.env.NEWS_API_KEY;

// Debug keys
console.log("🔑 NEWS_API_KEY:", NEWS_API_KEY);
console.log("🗄️ MONGO_URI detected:", !!MONGO_URI);

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files (logo, default images)
app.use("/public", express.static(path.join(__dirname, "../../public")));

// Routes
app.use("/news", newsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Flash20 API",
    timestamp: new Date().toISOString(),
  });
});

// Connect to MongoDB Atlas
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");

    // Fetch news immediately
    fetchTopNews()
      .then(() => console.log("✅ Initial news fetch complete"))
      .catch((err) => console.error("❌ Initial news fetch failed:", err));

    // Schedule daily news fetch
    scheduleNewsFetch();

    // Start server
    app.listen(PORT, () =>
      console.log(`🚀 Flash20 server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  });

// Global error handling
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});

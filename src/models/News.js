// flash10-backend/src/models/News.js
import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  content: String,
  imageUrl: { type: String, default: "/public/default.jpg" },
  url: { type: String, required: true, unique: true },
  source: String,
  category: {
    type: String,
    enum: [
      "general", "politics", "sports", "entertainment",
      "technology", "science", "health", "business",
      "world", "weather"
    ],
    default: "general",
  },
  publishedAt: { type: Date, default: Date.now },
  dayTag: String,
  fetchedAt: { type: Date, default: Date.now },
});

// Auto-delete after 7 days using TTL index
newsSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 604800 });

// Index for fast category queries
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ dayTag: 1 });

const News = mongoose.model("News", newsSchema);
export default News;

import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  imageUrl: { type: String, default: "/public/default.jpg" },
  url: String,
  publishedAt: Date,
  dayTag: String, // like 2025-08-25
});

// Auto-delete after 7 days (604800 seconds)
newsSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 604800 });

const News = mongoose.model("News", newsSchema);
export default News;

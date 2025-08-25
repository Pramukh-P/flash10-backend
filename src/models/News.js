import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  imageUrl: { type: String, default: "/public/default.jpg" },
  url: String,
  publishedAt: Date,
  dayTag: String,
});

// Auto-delete after 7 days
newsSchema.index({ publishedAt: 1 }, { expireAfterSeconds: 604800 });

const News = mongoose.model("News", newsSchema);
export default News;

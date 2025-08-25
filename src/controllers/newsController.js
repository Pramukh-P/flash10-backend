import News from "../models/News.js";

export const getNews = async () => {
  const today = new Date();
  const dayTag = today.toISOString().split("T")[0];

  const news = await News.find({ dayTag })
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();

  return news;
};

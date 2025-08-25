import News from "../models/News.js";

// Fetch all news
export const getNews = async () => {
  const news = await News.find().sort({ publishedAt: -1 });
  return news;
};

// Fetch single news by ID
export const getNewsById = async (id) => {
  const newsItem = await News.findById(id);
  return newsItem;
};

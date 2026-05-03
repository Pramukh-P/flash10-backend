// flash10-backend/src/controllers/userController.js
import User from "../models/User.js";
import News from "../models/News.js";

// GET /user/me
export const getMe = async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    preferences: req.user.preferences,
    bookmarks: req.user.bookmarks,
  });
};

// PUT /user/preferences
export const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const validCategories = [
      "general", "politics", "sports", "entertainment",
      "technology", "science", "health", "business", "world", "weather"
    ];

    const filtered = (preferences || []).filter((p) =>
      validCategories.includes(p)
    );

    req.user.preferences = filtered;
    await req.user.save();

    res.json({ preferences: req.user.preferences });
  } catch (err) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
};

// POST /user/bookmarks/:newsId
export const addBookmark = async (req, res) => {
  try {
    const { newsId } = req.params;
    const user = req.user;

    if (!user.bookmarks.includes(newsId)) {
      user.bookmarks.push(newsId);
      await user.save();
    }

    res.json({ message: "Bookmarked", bookmarks: user.bookmarks });
  } catch (err) {
    res.status(500).json({ error: "Failed to bookmark" });
  }
};

// DELETE /user/bookmarks/:newsId
export const removeBookmark = async (req, res) => {
  try {
    const { newsId } = req.params;
    req.user.bookmarks = req.user.bookmarks.filter(
      (id) => id.toString() !== newsId
    );
    await req.user.save();

    res.json({ message: "Removed bookmark", bookmarks: req.user.bookmarks });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove bookmark" });
  }
};

// GET /user/bookmarks
export const getBookmarks = async (req, res) => {
  try {
    const user = await req.user.populate("bookmarks");
    res.json(user.bookmarks);
  } catch (err) {
    res.status(500).json({ error: "Failed to get bookmarks" });
  }
};

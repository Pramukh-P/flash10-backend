// flash10-backend/src/routes/user.js
import express from "express";
import {
  getMe,
  updatePreferences,
  addBookmark,
  removeBookmark,
  getBookmarks,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All user routes are protected
router.get("/me", protect, getMe);
router.put("/preferences", protect, updatePreferences);
router.get("/bookmarks", protect, getBookmarks);
router.post("/bookmarks/:newsId", protect, addBookmark);
router.delete("/bookmarks/:newsId", protect, removeBookmark);

export default router;
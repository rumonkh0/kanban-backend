import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
// Get all notifications
router.route("/").get(getNotifications);

// Mark all notifications as read
router.route("/mark-all-read").put(markAllAsRead);

// Manage a single notification
router.route("/:id").put(markAsRead).delete(deleteNotification);

export default router;

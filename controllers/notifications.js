import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Notification from "../models/Notification.js";

// @desc      Get all notifications for the current user
// @route     GET /api/v1/notifications
// @access    Private
export const getNotifications = asyncHandler(async (req, res, next) => {
  const { isRead } = req.query;
  const filter = { recipient: req.user.id };

  if (isRead === "false") {
    filter.isRead = false;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50); 

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

// @desc      Mark a single notification as read
// @route     PUT /api/v1/notifications/:id/read
// @access    Private
export const markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(
      new ErrorResponse("Notification not found or not owned by user.", 404)
    );
  }

  res.status(200).json({
    success: true,
    data: notification,
  });
});

// @desc      Mark ALL notifications as read for the current user
// @route     PUT /api/v1/notifications/mark-all-read
// @access    Private
export const markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read.",
    data: {},
  });
});

// @desc      Delete a notification
// @route     DELETE /api/v1/notifications/:id
// @access    Private
export const deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user.id,
  });

  if (!notification) {
    return next(
      new ErrorResponse("Notification not found or not owned by user.", 404)
    );
  }

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc      INTERNAL - Create a new notification
// @note      This function is for internal use by other controllers.
//            It should NOT be exposed as a public route.
export const createNotification = async ({ recipient, message }) => {
  try {
    await Notification.create({
      recipient,
      message,
    });
    console.log(`Notification created for user ${recipient}`);
  } catch (err) {
    console.error(`Error creating notification: ${err.message}`);
  }
};

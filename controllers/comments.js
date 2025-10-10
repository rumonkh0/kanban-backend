import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Comment from "../models/Comment.js";
import Task from "../models/Task.js";
import { populate } from "dotenv";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import { bulkCreateNotifications } from "./notifications.js";
import sendEmail, { bulkSendEmails } from "../utils/sendEmail.js";
import Freelancer from "../models/Freelancer.js";

// @desc      Create a new comment
// @route     POST /api/v1/tasks/:taskId/comments
// @access    Private
export const createComment = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;
  const { content } = req.body;

  // Validate that the task exists
  const existingTask = await Task.findById(taskId).populate(
    "project",
    "projectName"
  );
  if (!existingTask) {
    return next(new ErrorResponse("Task not found.", 404));
  }

  // console.log(existingTask);

  const comment = await Comment.create({
    content,
    author: req.user._id,
    task: taskId,
  });

  const exceptAuthor = existingTask.members.filter(
    (memberId) => memberId.toString() !== req.user.profile?._id.toString()
  );

  const admin = await Admin.findOne().populate("user", "email");

  const notificationRecipients = [...exceptAuthor, admin._id];

  // console.log(req.user);

  const notificationMessage = `New comment in task "${existingTask.title}"`;
  try {
    await bulkCreateNotifications({
      recipients:
        req.user.role !== "admin" ? notificationRecipients : exceptAuthor,
      message: notificationMessage,
    });
  } catch (error) {
    console.log(error);
  }

  const emailMessage = `A new comment has been added to the task "${existingTask.title}" of project "${existingTask.project?.projectName}".. Check it out!`;
  const emailSubject = `New Comment on Task "${existingTask.title}" of project "${existingTask.project?.projectName}"`;
  try {
    await bulkSendEmails({
      Model: Freelancer,
      recipientIds: exceptAuthor,
      subject: emailSubject,
      message: emailMessage,
    });
    if (req.user.role !== "admin") {
      await sendEmail({
        email: admin?.user?.email,
        subject: `New Comment on Task "${existingTask.title}" of project "${existingTask.project?.projectName}"`,
        message: `A new comment has been added to the task "${existingTask.title}" of project "${existingTask.project?.projectName}".. Check it out!`,
      });
    }
  } catch (error) {
    console.log(error);
  }

  res.status(201).json({
    success: true,
    data: comment,
  });
});

// @desc      Get all comments for a task
// @route     GET /api/v1/tasks/:taskId/comments
// @access    Private
export const getComments = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;

  // Validate that the task exists
  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    return next(new ErrorResponse("Task not found.", 404));
  }

  const comments = await Comment.find({ task: taskId })
    .populate({
      path: "author",
      select: "email role profile",
      populate: {
        path: "profile",
        select: "name profilePicture",
        populate: {
          path: "profilePicture",
          select: "filePath",
        },
      },
    })
    .sort({ createdAt: 1 });
  // const usr = await Admin.findById(comments[0].author.profile);
  // console.log(usr);

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

// @desc      Update a specific comment
// @route     PUT /api/v1/comments/:id
// @access    Private
export const updateComment = asyncHandler(async (req, res, next) => {
  const { content } = req.body;
  const { id } = req.params;

  let comment = await Comment.findById(id);

  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${id}`, 404));
  }

  if (comment.author.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new ErrorResponse(`Not authorized to update this comment`, 401)
    );
  }

  comment = await Comment.findByIdAndUpdate(
    id,
    { content },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc      Delete a specific comment
// @route     DELETE /api/v1/comments/:id
// @access    Private
export const deleteComment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const comment = await Comment.findById(id);

  if (!comment) {
    return next(new ErrorResponse(`Comment not found with id of ${id}`, 404));
  }

  if (comment.author.toString() !== req.user.id && req.user.role !== "Admin") {
    return next(
      new ErrorResponse(`Not authorized to delete this comment`, 400)
    );
  }

  await comment.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

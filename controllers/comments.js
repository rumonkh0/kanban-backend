import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Comment from "../models/Comment.js";
import Task from "../models/Task.js";

// @desc      Create a new comment
// @route     POST /api/v1/tasks/:taskId/comments
// @access    Private
export const createComment = asyncHandler(async (req, res, next) => {
  const { taskId } = req.params;
  const { content } = req.body;

  // Validate that the task exists
  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    return next(new ErrorResponse("Task not found.", 404));
  }

  const comment = await Comment.create({
    content,
    author: req.user._id, // Assuming a logged-in user ID from middleware
    task: taskId,
  });

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
    .populate("author", "name email") // Populate author details
    .sort({ createdAt: 1 }); // Sort by creation date for chronological order

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
  
  if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`Not authorized to update this comment`, 401));
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
  
  if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`Not authorized to delete this comment`, 401));
  }
  
  await comment.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
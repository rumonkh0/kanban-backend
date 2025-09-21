import asyncHandler from "../middleware/async.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Freelancer from "../models/Freelancer.js";
import ErrorResponse from "../utils/errorResponse.js";

// @desc      Create a task
// @route     POST /api/v1/tasks
// @access    Private/Admin
export const createTask = asyncHandler(async (req, res, next) => {
  const { members } = req.body;
  let uploadedFiles = [];
  let uploadedImages = [];

  const existingProject = await Project.findById(req.body.project);
  if (!existingProject)
    return next(new ErrorResponse("No associate project found", 404));

  if (members && members.length > 0) {
    const existingMembers = await Freelancer.find({
      _id: { $in: req.body.members },
    });
    if (existingMembers.length !== members.length)
      return next(new ErrorResponse("One or more members not found.", 404));
  }

  if (req.files) {
    if (req.files.files) {
      uploadedFiles = req.files.files.map((file) => file.path);
    }
    if (req.files.images) {
      uploadedImages = req.files.images.map((image) => image.path);
    }
  }

  const task = await Task.create({
    ...req.body,
    files: uploadedFiles,
    images: uploadedImages,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
});

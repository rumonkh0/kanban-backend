import asyncHandler from "../middleware/async.js";
import Project from "../models/Project.js";
import User from "../models/User.js";

// @desc      Create project
// @route     POST /api/v1/project
// @access    Private/Admin
export const createProject = asyncHandler(async (req, res, next) => {
  let relatedFiles = [];
  if (req.files && req.files.relatedFiles.length > 0) {
    relatedFiles = req.files.relatedFiles.map((file) => file.path);
  }
  const project = await Project.create({
    ...req.body,
    relatedFiles,
  });

  res.status(201).json({
    success: true,
    data: project,
  });
});

import asyncHandler from "../middleware/async.js";
import Stage from "../models/Stage.js";
import Project from "../models/Project.js";

// @desc      Create a stage
// @route     POST /api/v1/stages
// @access    Private/Admin
export const createStage = asyncHandler(async (req, res, next) => {
  const existingProject = await Project.findById(req.body.project);
  if (!existingProject) {
    return res.status(404).json({
      success: false,
      error: "Project not found.",
    });
  }

  // Create the new stage document using the data from the request body
  const stage = await Stage.create(req.body);

  // Send a success response with the newly created stage data
  res.status(201).json({
    success: true,
    data: stage,
  });
});

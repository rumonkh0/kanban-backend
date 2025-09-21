import asyncHandler from "../middleware/async.js";
import TeamPayment from "../models/TeamPayment.js";
import Project from "../models/Project.js";
import Freelancer from "../models/Freelancer.js";
import ErrorResponse from "../utils/errorResponse.js";

// @desc      Create a team payment record
// @route     POST /api/v1/team-payments
// @access    Private/Admin
export const createTeamPayment = asyncHandler(async (req, res, next) => {
  const { project, freelancer } = req.body;
  let relatedFile = null;

  const existingProject = await Project.findById(project);
  if (!existingProject)
    return next(new ErrorResponse("Project not found.", 404));

  if (freelancer) {
    const existingFreelancer = await Freelancer.findById(freelancer);
    if (!existingFreelancer)
      return next(new ErrorResponse("Freelancer not found.", 404));
  }

  if (req.file) {
    relatedFile = req.file.path;
  }

  const payment = await TeamPayment.create({
    ...req.body,
    relatedFile,
  });

  res.status(201).json({
    success: true,
    data: payment,
  });
});

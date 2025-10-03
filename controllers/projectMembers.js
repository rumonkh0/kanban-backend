import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import ProjectMember from "../models/ProjectMember.js";
import Project from "../models/Project.js";
import Freelancer from "../models/Freelancer.js";

// @desc      Create a project member
// @route     POST /api/v1/projectmembers
// @access    Private/Admin
export const createProjectMember = asyncHandler(async (req, res, next) => {
  const { project, freelancer, haveToPay, amountPaid, ...associationData } =
    req.body;

  // 1. Validation Checks
  const existingProject = await Project.findById(project);
  if (!existingProject) {
    return next(new ErrorResponse("Project not found.", 404));
  }
  const existingFreelancer = await Freelancer.findById(freelancer);
  if (!existingFreelancer) {
    return next(new ErrorResponse("Freelancer not found.", 404));
  }

  const existingMember = await ProjectMember.findOne({ project, freelancer });
  if (existingMember) {
    return next(
      new ErrorResponse(
        "This freelancer is already a member of this project.",
        400
      )
    );
  }

  const member = new ProjectMember({
    project,
    freelancer,
    haveToPay,
    ...associationData,
  });

  await member.save();

  res.status(201).json({
    success: true,
    data: member,
  });
});
// @desc      Get all project members (with optional filters)
// @route     GET /api/v1/projectmembers
// @route     GET /api/v1/projects/:projectId/members
// @route     GET /api/v1/freelancers/:freelancerId/projects
// @access    Private
export const getProjectMembers = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.params.projectId) {
    filter.project = req.params.projectId;
  }
  if (req.params.freelancerId) {
    filter.freelancer = req.params.freelancerId;
  }

  const members = await ProjectMember.find(filter)
    .populate("project", "projectName")
    .populate({
      path: "freelancer",
      select: "name user profilePicture",
      populate: [
        {
          path: "profilePicture",
          select: "filePath",
        },
        {
          path: "user",
          select: "email",
        },
      ],
    });

  res.status(200).json({
    success: true,
    count: members.length,
    data: members,
  });
});

// @desc      Get a single project member
// @route     GET /api/v1/projectmembers/:id
// @access    Private
export const getProjectMember = asyncHandler(async (req, res, next) => {
  const member = await ProjectMember.findById(req.params.id)
    .populate("project", "projectName")
    .populate({
      path: "freelancer",
      select: "name profilePicture",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    });

  if (!member) {
    return next(
      new ErrorResponse(
        `Project member not found with id of ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: member,
  });
});

// @desc      Update a project member
// @route     PUT /api/v1/projectmembers/:id
// @access    Private/Admin
export const updateProjectMember = asyncHandler(async (req, res, next) => {
  let member = await ProjectMember.findById(req.params.id);

  if (!member) {
    return next(
      new ErrorResponse(
        `Project member not found with id of ${req.params.id}`,
        404
      )
    );
  }
  Object.assign(member, req.body);
  member = await member.save();

  res.status(200).json({
    success: true,
    data: member,
  });
});

// @desc      Delete a project member
// @route     DELETE /api/v1/projectmembers/:id
// @access    Private/Admin
export const deleteProjectMember = asyncHandler(async (req, res, next) => {
  let member;
  console.log(req.params.projectId, req.params.id);
  if (req.params.projectId)
    member = await ProjectMember.findOne({
      project: req.params.projectId,
      freelancer: req.params.id,
    });
  else member = await ProjectMember.findById(req.params.id);

  if (!member) {
    return next(
      new ErrorResponse(
        `Project member not found with id of ${req.params.id}`,
        404
      )
    );
  }

  await member.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

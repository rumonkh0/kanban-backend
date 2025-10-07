import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import ProjectMember from "../models/ProjectMember.js";
import Project from "../models/Project.js";
import Freelancer from "../models/Freelancer.js";
import { createNotification } from "./notifications.js";
import { addProjectActivity } from "./projectActivity.js";
import sendEmail from "../utils/sendEmail.js";

// @desc      Create a project member
// @route     POST /api/v1/projectmembers
// @access    Private/Admin
export const createProjectMember = asyncHandler(async (req, res, next) => {
  const { project, freelancer, haveToPay, ...associationData } = req.body;

  const member = await addProjectMember(
    project,
    freelancer,
    { haveToPay, ...associationData } // Pass relevant optional fields
  );

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
    .populate({
      path: "project",
      select: "projectName status client",
      populate: [
        {
          path: "client",
          select: "name profilePicture",
          populate: {
            path: "profilePicture",
            select: "filePath",
          },
        },
      ],
    })
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
    })
    .limit(req.query.limit);

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

/**
 * Associates a freelancer with a project and handles all related notifications/logs.
 * @param {string} projectId - The ID of the project.
 * @param {string} freelancerId - The ID of the freelancer.
 * @param {object} projectDetails - The full project document/object (or at least _id and projectName).
 * @param {object} memberInfo - Object containing { name, email }.
 * @param {object} associationData - Additional data for the ProjectMember document.
 * @returns {object} The created ProjectMember document.
 * @throws {ErrorResponse} If validation fails.
 */
export const addProjectMember = async (
  projectId,
  freelancerId,
  projectDetails,
  associationData = {}
) => {
  // 1. Validation Checks (Remain essential here)
  const existingProject = await Project.findById(projectId._id);
  if (!existingProject) {
    throw new ErrorResponse("Project not found.", 404);
  }
  const existingFreelancer = await Freelancer.findById(freelancerId).populate(
    "user",
    "email"
  );
  if (!existingFreelancer) {
    throw new ErrorResponse("Freelancer not found.", 404);
  }
  const existingMember = await ProjectMember.findOne({
    project: projectId,
    freelancer: freelancerId,
  });
  if (existingMember) {
    throw new ErrorResponse(
      "This freelancer is already a member of this project.",
      400
    );
  }

  // 2. Create the Project Member association
  const member = await ProjectMember.create({
    project: projectId,
    freelancer: freelancerId,
    ...associationData,
  });

  // 3. Handle Side Effects (Notification, Activity, Email)
  const notificationMessage = `You have been assigned to project "${projectDetails.projectName}"`;
  const activityMessage = `${existingFreelancer.name} assigned to project`;

  // Send Notification
  await createNotification({
    recipient: freelancerId,
    message: notificationMessage,
  });

  // Log Activity
  await addProjectActivity(activityMessage, projectId);

  // Send Email (Wrapped in try/catch to ensure database operation completes)
  console.log(existingFreelancer.user.email);
  if (existingFreelancer.user.email) {
    try {
      await sendEmail({
        to: existingFreelancer.user.email,
        subject: "You have been assigned to a new project",
        message: `Hi ${existingFreelancer.name},

You've been assigned to a new project: "${projectDetails.projectName}".

Please check the project details and your tasks on the platform.

Best regards,
The Team
`,
      });
    } catch (err) {
      console.error(
        `Failed to send email to ${existingFreelancer.user.email}:`,
        err
      );
    }
  }

  return member;
};

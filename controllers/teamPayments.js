import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import TeamPayment from "../models/TeamPayment.js";
import File from "../models/File.js";
import fs from "fs";
import Freelancer from "../models/Freelancer.js";
import Project from "../models/Project.js";
import ProjectMember from "../models/ProjectMember.js";
import path from "path";

// @desc      Create a team payment
// @route     POST /api/v1/teampayments
// @access    Private/Admin
export const createTeamPayment = asyncHandler(async (req, res, next) => {
  const { amountPaid, project, member: freelancer, ...paymentData } = req.body;

  const existingProject = await Project.findById(project);
  if (!existingProject)
    return next(new ErrorResponse("Project not found.", 404));

  const existingProjectFreelancer = await ProjectMember.findOne({
    freelancer,
    project,
  });

  if (!existingProjectFreelancer)
    return next(
      new ErrorResponse("Member is not associated with this project.", 404)
    );

  // Handle file upload
  let relatedFile = null;
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      const newFile = await File.create({
        //uploadedBy: req.user._id,
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      relatedFile = newFile._id;
    } catch (err) {
      fs.unlink(file.path, () => {});
      return next(
        new ErrorResponse(`Failed to create file record: ${err.message}`, 500)
      );
    }
  }

  const amountOwed = existingProjectFreelancer.amountOwed - amountPaid;

  const teamPayment = await TeamPayment.create({
    ...paymentData,
    project,
    freelancer,
    toBePaid: existingProjectFreelancer.amountOwed,
    amountPaid,
    amountOwed,
    relatedFile,
    // paymentStatus:
    //   amountOwed <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Owed",
  });

  res.status(201).json({
    success: true,
    data: teamPayment,
  });
});

// @desc      Get all team payments, or filter by project/freelancer
// @route     GET /api/v1/teampayments
// @route     GET /api/v1/projects/:projectId/teampayments
// @route     GET /api/v1/freelancers/:freelancerId/teampayments
// @access    Private/Admin
export const getTeamPayments = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.query.project) {
    filter.project = req.query.project;
  }
  if (req.params.projectId) {
    filter.project = req.params.projectId;
  }
  if (req.params.freelancerId) {
    filter.freelancer = req.params.freelancerId;
  }

  const teamPayments = await TeamPayment.find(filter)
    .populate({
      path: "project",
      select: "projectName amountPayableToMembers",
    })
    .populate({
      path: "freelancer",
      select: "name user profilePicture",
      populate: [
        { path: "user", select: "email" },
        { path: "profilePicture", select: "filePath" },
      ],
    })
    .populate("relatedFile", "filePath");

  res.status(200).json({
    success: true,
    count: teamPayments.length,
    data: teamPayments,
  });
});

// @desc      Get single team payment
// @route     GET /api/v1/teampayments/:id
// @access    Private/Admin
export const getTeamPayment = asyncHandler(async (req, res, next) => {
  const teamPayment = await TeamPayment.findById(req.params.id)
    .populate({
      path: "project",
      select: "projectName amountPayableToMembers",
    })
    .populate({
      path: "freelancer",
      select: "name user profilePicture",
      populate: [
        { path: "user", select: "email" },
        { path: "profilePicture", select: "filePath" },
      ],
    })
    .populate("relatedFile", "filePath");
  if (!teamPayment) {
    return next(
      new ErrorResponse(
        `Team payment not found with id of ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: teamPayment,
  });
});

// @desc      Update a team payment
// @route     PUT /api/v1/teampayments/:id
// @access    Private/Admin
export const updateTeamPayment = asyncHandler(async (req, res, next) => {
  let teamPayment = await TeamPayment.findById(req.params.id);

  if (!teamPayment) {
    return next(
      new ErrorResponse(
        `Team payment not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Handle file update
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      if (teamPayment.relatedFile) {
        const oldFile = await File.findById(teamPayment.relatedFile);
        if (oldFile && fs.existsSync(oldFile.filePath)) {
          fs.unlink(oldFile.filePath, (err) => {
            if (err) console.error("Error deleting old file:", err);
          });
          await File.findByIdAndDelete(oldFile._id);
        }
      }
      const newFile = await File.create({
        //uploadedBy: req.user._id,
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      req.body.relatedFile = newFile._id;
    } catch (err) {
      fs.unlink(file.path, () => {});
      return next(
        new ErrorResponse(`Failed to update file record: ${err.message}`, 500)
      );
    }
  }

  // Calculate updated amount owed
  if (req.body.toBePaid !== undefined || req.body.amountPaid !== undefined) {
    const newToBePaid = req.body.toBePaid || teamPayment.toBePaid;
    const newAmountPaid = req.body.amountPaid || teamPayment.amountPaid;
    req.body.amountOwed = newToBePaid - newAmountPaid;

    if (req.body.amountOwed <= 0) {
      req.body.paymentStatus = "Paid";
    } else if (newAmountPaid > 0) {
      req.body.paymentStatus = "Partial";
    } else {
      req.body.paymentStatus = "Owed";
    }
  }

  teamPayment = await TeamPayment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: teamPayment,
  });
});

// @desc      Delete a team payment
// @route     DELETE /api/v1/teampayments/:id
// @access    Private/Admin
export const deleteTeamPayment = asyncHandler(async (req, res, next) => {
  const teamPayment = await TeamPayment.findById(req.params.id);

  if (!teamPayment) {
    return next(
      new ErrorResponse(
        `Team payment not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Delete associated file
  if (teamPayment.relatedFile) {
    const file = await File.findById(teamPayment.relatedFile);
    if (file && fs.existsSync(file.filePath)) {
      fs.unlink(file.filePath, (err) => {
        if (err) console.error("Error deleting team payment file:", err);
      });
      await File.findByIdAndDelete(file._id);
    }
  }

  await teamPayment.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

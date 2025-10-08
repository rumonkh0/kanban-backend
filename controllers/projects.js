import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Project from "../models/Project.js";
import Service from "../models/Service.js";
import Client from "../models/Client.js";
import Freelancer from "../models/Freelancer.js";
import File from "../models/File.js";
import fs from "fs";
import ProjectMember from "../models/ProjectMember.js";
import { addProjectActivity } from "./projectActivity.js";
import { createNotification } from "./notifications.js";
import sendEmail from "../utils/sendEmail.js";
import { addProjectMember } from "./projectMembers.js";
import mongoose from "mongoose";
import Task from "../models/Task.js";

// @desc      Create a project
// @route     POST /api/v1/projects
// @access    Private/Admin
export const createProject = asyncHandler(async (req, res, next) => {
  const {
    price,
    customPrice,
    discount,
    amountPaidByClient,
    amountPaidToMembers,
    relatedFiles,
    service,
    client,
    members,
    ...projectData
  } = req.body;

  // 1. Validate Service, Client, and Members
  if (service && service !== "") {
    const existingService = await Service.findById(service).populate(
      "freelancers"
    );
    if (!existingService) {
      return next(new ErrorResponse("Service not found.", 404));
    }
    members = existingService.members.map((member) => member._id);
  }
  if (client) {
    const existingClient = await Client.findById(client);
    if (!existingClient) {
      return next(new ErrorResponse("Client not found.", 404));
    }
  }

  if (members && members.length > 0) {
    for (const memberId of members) {
      const existingMember = await Freelancer.findById(memberId);
      if (!existingMember) {
        return next(
          new ErrorResponse(`Freelancer not found with ID ${memberId}`, 404)
        );
      }
    }
  }

  // 2. Handle File Uploads
  let fileIds = [];
  if (
    req.files &&
    req.files.relatedFiles &&
    req.files.relatedFiles.length > 0
  ) {
    try {
      const filePromises = req.files.relatedFiles.map((file) =>
        File.create({
          //uploadedBy: req.user._id,
          filePath: path.relative("public", file.path),
          mimeType: file.mimetype,
          fileSize: file.size,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.filename.split(".").pop(),
        })
      );
      const newFiles = await Promise.all(filePromises);
      fileIds = newFiles.map((file) => file._id);
    } catch (err) {
      req.files.relatedFiles.forEach((file) => fs.unlink(file.path, () => {}));
      return next(
        new ErrorResponse(`Failed to create file records: ${err.message}`, 500)
      );
    }
  }

  // 3. Calculate Financial Fields
  const finalAmountForClient =
    customPrice > 0
      ? customPrice
      : (price || 0) - (price || 0) * ((discount || 0) / 100);

  const amountOwedByClient = finalAmountForClient - (amountPaidByClient || 0);
  const amountOwedToMembers =
    (projectData.amountPayableToMembers || 0) - (amountPaidToMembers || 0);
  const finalAmountEarned =
    (finalAmountForClient || 0) - (projectData.amountPayableToMembers || 0);

  const project = await Project.create({
    ...projectData,

    service,
    client,
    members,
    relatedFiles: fileIds,
    price,
    discount,
    finalAmountForClient,
    amountPaidByClient,
    amountOwedByClient,
    amountPaidToMembers,
    amountOwedToMembers,
    finalAmountEarned,
  });

  await addProjectActivity("Project Created", project._id);

  // 5. Create a ProjectMember document for each freelancer

  if (members && members.length > 0) {
    const memberPromises = members.map(async (freelancerId) => {
      addProjectMember(project._id, freelancerId, project);
    });

    await Promise.all(memberPromises);
  }

  res.status(201).json({
    success: true,
    data: project,
  });
});

// @desc      Get all projects
// @route     GET /api/v1/projects
// @access    Private
export const getProjects = asyncHandler(async (req, res, next) => {
  const filters = { ...req.query };
  if (req.user.role === "Client") {
    filters.client = req.user.profile._id;
  }
  console.log(req.query);
  const projects = await Project.find(filters)
    .populate("service", "serviceName")
    .populate({
      path: "client",
      select: "name companyName profilePicture",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    })
    .populate({
      path: "members",
      select: "name profilePicture",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    })
    .populate("relatedFiles", "originalName filePath");

  res.status(200).json({
    success: true,
    count: projects.length,
    data: projects,
  });
});

// @desc      Get a single project
// @route     GET /api/v1/projects/:id
// @access    Private
export const getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate("service", "serviceName")
    .populate({
      path: "client",
      select: "name profilePicture user",
      populate: [
        { path: "profilePicture", select: "filePath" },
        { path: "user", select: "email" },
      ],
    })
    .populate({
      path: "members",
      select: "name profilePicture",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    })
    .populate("relatedFiles", "originalName filePath");

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: project,
  });
});

// @desc      Get a single project
// @route     GET /api/v1/projects/:id
// @access    Private
export const getProjectDetails = asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;

  // 1️⃣ Fetch the project with client details populated
  const project = await Project.findById(projectId)
    .populate({
      path: "client",
      select: "name profilePicture user",
      populate: [
        { path: "profilePicture", select: "filePath" },
        { path: "user", select: "email" },
      ],
    })
    .lean();

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${projectId}`, 404)
    );
  }

  // 2️⃣ Client project stats (total + active)
  const clientId = project.client?._id;

  let clientStats = { totalProjects: 0, activeProjects: 0 };

  if (clientId) {
    const clientProjectStats = await Project.aggregate([
      { $match: { client: new mongoose.Types.ObjectId(clientId) } },
      {
        $group: {
          _id: null,
          totalProjects: { $sum: 1 },
          activeProjects: {
            $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] },
          },
        },
      },
    ]);

    clientStats = clientProjectStats[0] || clientStats;
  }

  // 3️⃣ Task stats for this project (group by status)
  const taskStats = await Task.aggregate([
    { $match: { project: new mongoose.Types.ObjectId(projectId) } },
    {
      $facet: {
        active: [
          { $match: { status: { $in: ["Active", "In Progress"] } } },
          { $count: "count" },
        ],
        completed: [{ $match: { status: "Completed" } }, { $count: "count" }],
        overdue: [
          {
            $match: {
              dueDate: { $lt: new Date() },
              status: { $ne: "Completed" },
            },
          },
          { $count: "count" },
        ],
      },
    },
    {
      $project: {
        active: { $ifNull: [{ $arrayElemAt: ["$active.count", 0] }, 0] },
        completed: { $ifNull: [{ $arrayElemAt: ["$completed.count", 0] }, 0] },
        overdue: { $ifNull: [{ $arrayElemAt: ["$overdue.count", 0] }, 0] },
      },
    },
  ]);

  // Format task stats for readability
  const taskSummary = {
    Active: 0,
    Completed: 0,
    Overdue: 0,
  };
  taskStats.forEach((s) => (taskSummary[s._id] = s.count));

  // 4️⃣ Combine everything
  res.status(200).json({
    success: true,
    data: {
      ...project,
      clientStats: {
        totalProjects: clientStats.totalProjects || 0,
        activeProjects: clientStats.activeProjects || 0,
      },
      taskStats: [
        { key: "Active", value: taskSummary["Active"] },
        { key: "Completed", value: taskSummary["Completed"] },
        { key: "Overdue", value: taskSummary["Overdue"] },
      ],
    },
  });
});

// @desc      Update a project
// @route     PUT /api/v1/projects/:id
// @access    Private/Admin
export const updateProject = asyncHandler(async (req, res, next) => {
  // 1. Find the document
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404)
    );
  }

  // Destructure fields that require special handling or are for middleware
  const {
    // Financial fields (will be passed to Object.assign)
    price,
    customPrice,
    discount,
    amountPayableToMembers,
    amountPaidToMembers,

    // Relationship fields
    members,
    service,

    // Exclude calculated fields from direct assignment
    amountOwedByClient,
    finalAmountForClient,
    amountPaidByClient,
    amountOwedToMembers,
    finalAmountEarned,

    status,

    ...updateData
  } = req.body;

  let newMembers = members;
  const oldMembers = project.members.map((memberId) => memberId.toString());

  // --- 2. Relationship and File Handling ---

  // Handle member updates from a new service or direct members list
  if (service) {
    const newService = await Service.findById(service).populate("members");
    if (!newService) {
      return next(new ErrorResponse("Service not found.", 404));
    }
    newMembers = newService.members.map((member) => member._id);
  }

  // Validate member IDs and prepare final member list
  if (newMembers) {
    for (const memberId of newMembers) {
      const existingMember = await Freelancer.findById(memberId);
      if (!existingMember) {
        return next(
          new ErrorResponse(`Freelancer not found with ID ${memberId}`, 404)
        );
      }
    }
  }

  // Handle File Updates
  if (
    req.files &&
    req.files.relatedFiles &&
    req.files.relatedFiles.length > 0
  ) {
    try {
      const filePromises = req.files.relatedFiles.map((file) =>
        File.create({
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.filename.split(".").pop(),
          linkedTo: project._id,
          linkedModel: "Project",
        })
      );
      const newFiles = await Promise.all(filePromises);

      // Add new file IDs to the existing document array
      updateData.relatedFiles = [
        ...(project.relatedFiles || []),
        ...newFiles.map((file) => file._id),
      ];
    } catch (err) {
      req.files.relatedFiles.forEach((file) => fs.unlink(file.path, () => {}));
      return next(
        new ErrorResponse(`Failed to create file records: ${err.message}`, 500)
      );
    }
  }

  // --- 3. Update ProjectMember Documents ---
  if (newMembers) {
    const newMembersSet = new Set(newMembers.map((id) => id.toString()));
    const oldMembersSet = new Set(oldMembers);

    const membersToDelete = oldMembers.filter((id) => !newMembersSet.has(id));
    const membersToAdd = newMembers.filter(
      (id) => !oldMembersSet.has(id.toString())
    );

    if (membersToDelete.length > 0) {
      await ProjectMember.deleteMany({
        project: project._id,
        freelancer: { $in: membersToDelete },
      });
    }

    if (membersToAdd.length > 0) {
      const memberCreationPromises = membersToAdd.map((freelancerId) =>
        addProjectMember(project._id, freelancerId, project)
      );
      await Promise.all(memberCreationPromises);
    }
    // Update the project document's member list (before save)
    updateData.members = newMembers;
  }

  // Ensure service field is updated
  if (service) {
    updateData.service = service;
  }

  if (status && status === "Complete" && project.status !== "Complete")
    req.body.completionDate = Date.now();
  else req.body.completionDate = null;

  // --- 4. Apply Updates and Trigger Hook ---

  // Merge the existing document with all the new data from req.body
  // This marks the relevant fields as modified.
  Object.assign(project, req.body, updateData);

  // Explicitly call save() to trigger pre('save') middleware
  project = await project.save();

  res.status(200).json({
    success: true,
    data: project,
  });
});

// @desc      Delete a project
// @route     DELETE /api/v1/projects/:id
// @access    Private/Admin
export const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete associated files from disk and DB
  if (project.relatedFiles && project.relatedFiles.length > 0) {
    const filesToDelete = await File.find({
      _id: { $in: project.relatedFiles },
    });
    for (const file of filesToDelete) {
      if (fs.existsSync(file.filePath)) {
        fs.unlink(file.filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      await File.findByIdAndDelete(file._id);
    }
  }

  await project.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

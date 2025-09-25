import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Stage from "../models/Stage.js";
import Freelancer from "../models/Freelancer.js";
import File from "../models/File.js";
import fs from "fs";

// @desc      Create a task
// @route     POST /api/v1/projects/:projectId/stages/:stageId/tasks
// @access    Private/Admin
export const createTask = asyncHandler(async (req, res, next) => {
  const { projectId, stageId } = req.params;
  const { members, ...taskData } = req.body;

  // 1. Validate existence of Project, Stage, and Members
  const existingProject = await Project.findById(projectId);
  if (!existingProject) {
    return next(new ErrorResponse("Project not found.", 404));
  }
  const existingStage = await Stage.findById(stageId);
  if (!existingStage) {
    return next(new ErrorResponse("Stage not found.", 404));
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

  // 2. Automatically determine the 'order' for the new task
  const lastTask = await Task.findOne({ stage: stageId })
    .sort({ order: -1 })
    .select("order");
  const newOrder = lastTask ? lastTask.order + 1 : 1;

  // 3. Handle File Uploads (assuming multer passes files in req.files)
  let fileIds = [];
  let imageIds = [];

  fileIds = await handleFiles(req.files.files, "file");
  imageIds = await handleFiles(req.files.images, "image");

  const task = await Task.create({
    ...taskData,
    project: projectId,
    stage: stageId,
    members,
    order: newOrder,
    files: fileIds,
    images: imageIds,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
});

// @desc      Get all tasks for a project or stage
// @route     GET /api/v1/projects/:projectId/tasks
// @route     GET /api/v1/projects/:projectId/stages/:stageId/tasks
// @access    Private
export const getTasks = asyncHandler(async (req, res, next) => {
  const filter = {};
  if (req.params.projectId) {
    filter.project = req.params.projectId;
  }
  if (req.params.stageId) {
    filter.stage = req.params.stageId;
  }

  const tasks = await Task.find(filter)
    .populate("project", "projectName")
    .populate("stage", "title")
    .populate("members", "name profilePicture")
    .populate("files", "originalName filePath")
    .populate("images", "originalName filePath")
    //.populate("comments.author", "name")
    .sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

// @desc      Get a single task
// @route     GET /api/v1/tasks/:id
// @access    Private
export const getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate("project", "projectName")
    .populate("stage", "title")
    .populate("members", "name profilePicture")
    .populate("files", "originalName filePath")
    .populate("images", "originalName filePath");
  //.populate("comments.author", "name");

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc      Update a task
// @route     PUT /api/v1/tasks/:id
// @access    Private/Admin
export const updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
    );
  }

  // 1. Handle re-ordering if stage is changed
  if (req.body.stage && req.body.stage.toString() !== task.stage.toString()) {
    const lastTaskInNewStage = await Task.findOne({ stage: req.body.stage })
      .sort({ order: -1 })
      .select("order");
    req.body.order = lastTaskInNewStage ? lastTaskInNewStage.order + 1 : 1;
  }

  // 2. Handle File and Image Updates
  if (req.files) {
    if (req.files.files) {
      // Add new files
      const newFileIds = await handleFiles(req.files.files, "file");
      req.body.files = [...task.files, ...newFileIds];
    }
    if (req.files.images) {
      // Add new images
      const newImageIds = await handleFiles(req.files.images, "image");
      req.body.images = [...task.images, ...newImageIds];
    }
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc      Delete a task
// @route     DELETE /api/v1/tasks/:id
// @access    Private/Admin
export const deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete associated files from disk and DB
  const filesToDelete = [...task.files, ...task.images];
  if (filesToDelete.length > 0) {
    const fileDocs = await File.find({ _id: { $in: filesToDelete } });
    for (const file of fileDocs) {
      if (fs.existsSync(file.filePath)) {
        fs.unlink(file.filePath, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      await File.findByIdAndDelete(file._id);
    }
  }

  await task.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Helper function for file handling
const handleFiles = async (files, type) => {
  if (!files || files.length === 0) return [];

  try {
    const filePromises = files.map((file) =>
      File.create({
        // uploadedBy: "some_user_id",
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      })
    );
    const newFiles = await Promise.all(filePromises);
    return newFiles.map((file) => file._id);
  } catch (err) {
    files.forEach((file) => fs.unlink(file.path, () => {}));
    throw new ErrorResponse(
      `Failed to create file records: ${err.message}`,
      500
    );
  }
};

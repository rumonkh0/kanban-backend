import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import Stage from "../models/Stage.js";
import Freelancer from "../models/Freelancer.js";
import File from "../models/File.js";
import { generateKeyBetween } from "fractional-indexing";
import fs from "fs";
import path from "path";
import { addProjectActivity } from "./projectActivity.js";
import sendEmail, { bulkSendEmails } from "../utils/sendEmail.js";
import Admin from "../models/Admin.js";
import { bulkCreateNotifications } from "./notifications.js";

// @desc      Create a task
// @route     POST /api/v1/projects/:projectId/stages/:stageId/tasks
// @access    Private/Admin
export const createTask = asyncHandler(async (req, res, next) => {
  const { projectId, stageId } = req.params;
  if (projectId) req.body.project = projectId;
  if (stageId) req.body.stage = stageId;
  const { members, order, ...taskData } = req.body;

  // 1. Validate existence of Project, Stage, and Members
  const existingProject = await Project.findById(req.body.project);
  if (!existingProject) {
    return next(new ErrorResponse("Project not found.", 404));
  }
  const existingStage = await Stage.findById(req.body.stage);
  if (!existingStage) {
    return next(new ErrorResponse("Stage not found.", 404));
  }
  if (members && members.length > 0) {
    for (const memberId of members) {
      const existingMember = await Freelancer.findById(memberId).populate(
        "user",
        "email"
      );
      if (!existingMember) {
        return next(
          new ErrorResponse(`Freelancer not found with ID ${memberId}`, 404)
        );
      }
      // await addProjectActivity(
      //   `${existingMember.name} added to task ${req.body.title}`,
      //   memberId
      // );

      try {
        await sendEmail({
          to: existingFreelancer.user.email,
          subject: "You have been assigned to a new task",
          message: `Hi ${existingFreelancer.name},

You've been assigned to a new task: "${req.body.title}".

Please check the project details and your tasks on the platform.

Best regards,
The Team
`,
        });
      } catch {}
    }
    const notificationMessage = `You are assigned to task "${req.body.title}"`;
    try {
      await bulkCreateNotifications({
        recipients: members,
        message: notificationMessage,
      });
    } catch (error) {
      console.log(error);
    }
  }

  // 2. Automatically determine the 'order' for the new task
  const lastTask = await Task.findOne({ stage: req.body.stage })
    .sort({ order: -1 })
    .select("order");
  let newOrder;
  try {
    // console.log(lastTask?.order);
    newOrder = generateKeyBetween(lastTask?.order, undefined);
    // await task.save();
  } catch (error) {
    console.log(error);
    return next(new ErrorResponse(`Task can't update`, 304));
  }

  // 3. Handle File Uploads (assuming multer passes files in req.files)
  let fileIds = [];
  let imageIds = [];

  fileIds = await handleFiles(req.files?.files, "file");
  imageIds = await handleFiles(req.files?.images, "image");

  const task = await Task.create({
    ...taskData,
    members,
    order: newOrder,
    files: fileIds,
    images: imageIds,
  });

  await addProjectActivity(`New task added - ${task.title}`, req.body.project);

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
  const filters = { ...req.query };
  if (req.params.projectId) {
    filters.project = req.params.projectId;
  }
  if (req.user.role === "Freelancer") filters.members = req.user.profile?._id;
  if (req.params.stageId) {
    filters.stage = req.params.stageId;
  }
  console.log(filters);

  // console.log(req.params);
  const tasks = await Task.find(filters)
    .populate("project", "projectName shortCode")
    // .populate("stage", "title")
    .populate({
      path: "members",
      select: "name profilePicture",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    })
    .populate({
      path: "files",
      select: "originalName filePath",
    })
    .populate({
      path: "images",
      select: "originalName filePath",
    })
    .populate({
      path: "coverImage",
      select: "originalName filePath",
    })
    // .populate({ path: "stage", select: "title" })
    .populate({
      path: "comments",
      options: { sort: { createdAt: 1 } },
      populate: {
        path: "author",
        select: "email",
        // populate: {
        //   path: "profile",
        //   select: "filePath",
        // },
      },
    })
    .sort({ stage: 1, order: 1 });

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
    .populate({
      path: "project",
      select: "projectName client",
      populate: {
        path: "client",
        select: "name profilePicture",
        populate: {
          path: "profilePicture",
          select: "filePath",
        },
      },
    })
    .populate("stage", "title color")
    // .populate("members", "name profilePicture")
    .populate("files", "originalName filePath")
    .populate("images", "originalName filePath")
    .populate("coverImage", "originalName filePath");
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
  let task = await Task.findById(req.params.id).populate(
    "project",
    "projectName"
  );

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404)
    );
  }

  let newMembers = req.body.members;
  const oldMembers = task.members.map((memberId) => memberId.toString());
  if (newMembers) {
    const newMembersSet = new Set(newMembers.map((id) => id.toString()));
    const oldMembersSet = new Set(oldMembers);

    const membersToDelete = oldMembers.filter((id) => !newMembersSet.has(id));
    const membersToAdd = newMembers.filter(
      (id) => !oldMembersSet.has(id.toString())
    );

    if (membersToAdd.length > 0) {
      //send notification and emial to new members
      const notificationMessage = `You are assigned to task "${task.title}"`;
      try {
        await bulkCreateNotifications({
          recipients: membersToAdd,
          message: notificationMessage,
        });
      } catch (error) {
        console.log(error);
      }

      const emailMessage = `You are added to task "${task.title}" of project "${task.project?.projectName}".. Check it out!`;
      const emailSubject = `Assigned to new task "${task.title}" of project "${task.project?.projectName}"`;
      try {
        await bulkSendEmails({
          Model: Freelancer,
          recipientIds: membersToAdd,
          subject: emailSubject,
          message: emailMessage,
        });
      } catch (error) {
        console.log(error);
      }
    }
  }

  const existingFileIds = req.body.files || [];

  const filesToRemove = Array.isArray(task.files)
    ? task.files.filter((f) => !existingFileIds.includes(f._id.toString()))
    : [];

  for (const file of filesToRemove) {
    if (file.filePath) {
      try {
        fs.unlinkSync(path.join(__dirname, "../uploads", file.filePath));
      } catch (err) {
        console.error("Failed to delete file:", file.filePath, err.message);
      }
    }
    await File.findByIdAndDelete(file._id);
  }

  task.files = req.body.files;
  console.log(task.files);

  if (req.files) {
    if (req.files.files) {
      // Add new files
      const newFileIds = await handleFiles(req.files.files, "file");
      req.body.files = [...(task.files || []), ...newFileIds];
      //activity
      const activityMsg = `${newFileIds.length} new file(s) added to task ${task.title}`;
      await addProjectActivity(activityMsg, task.project);

      //notification
      const notificationMessage = `New file(s) added to task "${task.title}"`;
      const exceptAuthor = task.members.filter(
        (memberId) => memberId.toString() !== req.user.profile?._id.toString()
      );
      const admin = await Admin.findOne().populate("user", "email");
      const notificationRecipients = [...exceptAuthor, admin._id];
      try {
        await bulkCreateNotifications({
          recipients:
            req.user.role !== "admin" ? notificationRecipients : exceptAuthor,
          message: notificationMessage,
        });
      } catch (error) {
        console.log(error);
      }

      //email
      const emailMessage = `New file(s) have been added to the task "${task.title}" of project "${task.project?.projectName}".. Check it out!`;
      const emailSubject = `New File(s) Added to Task "${task.title}" of project "${task.project?.projectName}"`;
      try {
        await bulkSendEmails({
          Model: Freelancer,
          recipientIds: exceptAuthor,
          subject: emailSubject,
          message: emailMessage,
        });
        if (req.user.role !== "admin") {
          await sendEmail({
            email: admin?.user?.email,
            subject: `New Comment on Task "${existingTask.title}" of project "${existingTask.project?.projectName}"`,
            message: `A new comment has been added to the task "${existingTask.title}" of project "${existingTask.project?.projectName}".. Check it out!`,
          });
        }
      } catch (error) {
        console.log(error);
      }
    }
    if (req.files.images) {
      // Add new images
      const newImageIds = await handleFiles(req.files.images, "image");
      req.body.images = [...task.images, ...newImageIds];
    }
    // console.log(req.files.coverImage);
    if (req.files.coverImage) {
      // Add new images
      const newImageIds = await handleFiles(req.files.coverImage, "coverImage");
      // console.log(newImageIds[0]);
      req.body.coverImage = newImageIds[0];
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

// @desc      Update a Task Order
// @route     PUT /api/v1/task/:id/reorder
// @access    Private/Admin
export const updateTaskOrder = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  let task = await Task.findById(id).populate("project", "projectName");
  if (!task) {
    return next(new ErrorResponse(`Task not found with id of ${id}`, 404));
  }
  if (req.body.newStage && task.stage.toString() !== req.body.newStage) {
    console.log(req.body.newStage, task.stage);
    //send notification to members about stage change
    const notificationMessage = `Task "${task.title}" moved to another stage`;
    try {
      await bulkCreateNotifications({
        recipients: task.members,
        message: notificationMessage,
      });
    } catch (error) {
      console.log(error);
    }

    const emailMessage = `Task "${task.title}" of project "${task.project?.projectName}" has been moved to another stage. Check it out!`;
    const emailSubject = `Task "${task.title}" Moved to Another Stage in project "${task.project?.projectName}"`;
    try {
      await bulkSendEmails({
        Model: Freelancer,
        recipientIds: task.members,
        subject: emailSubject,
        message: emailMessage,
      });
    } catch (error) {
      console.log(error);
    }
  }
  if (req.body.newStage) task.stage = req.body.newStage;

  let prevTask = await Task.findById(req.body.prev);
  let nextTask = await Task.findById(req.body.next);

  // if (prevTask && nextTask)
  //   if (!prevTask.stage.equals(nextTask.stage))
  //     return next(new ErrorResponse(`Invalid request`, 403));

  if (!prevTask && !nextTask) {
    prevTask = await Task.findOne({
      stage: req.body.newStage,
    }).sort({
      order: -1,
    });
  } else {
    if (prevTask)
      nextTask = await Task.findOne({
        stage: prevTask.stage,
        order: { $gt: prevTask.order },
      })
        .sort({ order: 1 })
        .limit(1);
    else
      prevTask = await Task.findOne({
        stage: nextTask.stage,
        order: { $lt: nextTask.order },
      })
        .sort({ order: -1 })
        .limit(1);

    // if (!nextTask)
    //   prevTask = await Task.findOne({
    //     project: task.project,
    //     stage: req.body.newStage,
    //   }).sort({ order: -1 });
    // if (!prevTask)
    //   nextTask = await Task.findOne({
    //     project: task.project,
    //     stage: req.body.newStage,
    //   }).sort({ order: 1 });
  }
  try {
    task.order = generateKeyBetween(prevTask?.order, nextTask?.order);
    await task.save();
  } catch (error) {
    return next(new ErrorResponse(`Task can't update`, 304));
  }

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

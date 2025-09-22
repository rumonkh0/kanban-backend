import asyncHandler from "../middleware/async.js";
import File from "../models/File.js";
import Project from "../models/Project.js";

// @desc      Create project
// @route     POST /api/v1/project
// @access    Private/Admin
export const createProject = asyncHandler(async (req, res, next) => {
  let relatedFiles = [];
  if (req.files && req.files.relatedFiles.length > 0) {
    for (const file of req.files.relatedFiles) {
      const newImage = await File.create({
        uploadedBy: req.admin._id,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      relatedFiles.push(newImage._id);
    }
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

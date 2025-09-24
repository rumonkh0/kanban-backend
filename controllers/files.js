import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import File from "../models/File.js";
import fs from "fs";
import path from "path";

// @desc      Upload a file and link it to a parent document
// @route     POST /api/v1/files/upload
// @access    Private
export const uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorResponse("No file uploaded.", 400));
  }

  const { linkedTo, linkedModel } = req.body;
  const user = req.user._id; // Assuming user is authenticated

  // Check if linkedTo and linkedModel are provided
  if (!linkedTo || !linkedModel) {
    // Delete the file from the disk if the link data is missing
    fs.unlinkSync(req.file.path);
    return next(
      new ErrorResponse("linkedTo and linkedModel fields are required.", 400)
    );
  }

  // Create a new file document
  const file = await File.create({
    uploadedBy: user,
    filePath: req.file.path,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    linkedTo,
    linkedModel,
  });

  res.status(201).json({
    success: true,
    data: file,
  });
});

// @desc      Get a file by ID
// @route     GET /api/v1/files/:id
// @access    Private
export const getFile = asyncHandler(async (req, res, next) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return next(new ErrorResponse("File not found.", 404));
  }

  // Serve the file to the client
  res.sendFile(path.resolve(file.filePath));
});

// @desc      Delete a file
// @route     DELETE /api/v1/files/:id
// @access    Private
export const deleteFile = asyncHandler(async (req, res, next) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return next(new ErrorResponse("File not found.", 404));
  }

  // Delete the file from the file system
  fs.unlink(file.filePath, async (err) => {
    if (err) {
      console.error(`Error deleting file from disk: ${err.message}`);
    }
    // Delete the file record from the database
    await file.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
      message: "File deleted successfully.",
    });
  });
});

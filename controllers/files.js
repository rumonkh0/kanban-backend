import asyncHandler from "../middleware/async.js";
import File from "../models/File.js";

// @desc      Upload a file and save its metadata
// @route     POST /api/v1/files/upload
// @access    Private/Admin
export const uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  const { originalname, filename, path, size, mimetype } = req.file;

  const newFile = await File.create({
    uploadedBy: req.user._id,
    filePath: path,
    mimeType: mimetype,
    fileSize: size,
    fileName: filename,
    originalName: originalname,
    fileType: path.extname(filename).slice(1),
  });

  res.status(201).json({
    success: true,
    data: newFile,
  });
});

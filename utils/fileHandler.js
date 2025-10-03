import path from "path";
import fs from "fs";
import File from "../models/File.js"; 
import ErrorResponse from "./errorResponse.js"; 

/**
 * Handles the upload, deletion of old file/DB entry, and creation of new File records.
 * * @param {object} doc - The existing Mongoose document (e.g., admin or themeSetting).
 * @param {object} updateData - The payload object being built for the update.
 * @param {object} reqFiles - req.files object from multer.
 * @param {string[]} fileFields - Array of field names to check for files (e.g., ['profilePicture', 'lightModeLogo']).
 * @param {function} next - Express next() function for error handling.
 * @returns {Promise<void>}
 */
export const handleFileUploads = async (
  doc,
  updateData,
  reqFiles,
  fileFields,
  next
) => {
  if (!reqFiles || fileFields.length === 0) return;

    // console.log("==============================================================================")
  for (const fieldName of fileFields) {
    if (reqFiles[fieldName] && reqFiles[fieldName].length > 0) {
      const file = reqFiles[fieldName][0];
      const oldFileId = doc[fieldName];

      // 1. DELETE OLD FILE AND DB ENTRY (if it exists)
      if (oldFileId) {
        const deleteFile = await File.findById(oldFileId);
        if (deleteFile) {
          // Safety check: ensure deleteFile exists before attempting to delete
          const fullPath = path.join("public", deleteFile.filePath);
          fs.unlink(fullPath, (err) => {
            if (err) console.error(`Error deleting old ${fieldName}:`, err);
          });
          await deleteFile.deleteOne();
        }
      }

      // 2. CREATE NEW FILE DB ENTRY
      try {
        const newImage = await File.create({
          // You can add uploadedBy: req.user._id if needed and if req.user is available here
          filePath: path.relative("public", file.path),
          mimeType: file.mimetype,
          fileSize: file.size,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.filename.split(".").pop(),
        });

        // 3. Update the main update payload with the new File ObjectId
        updateData[fieldName] = newImage._id;
      } catch (err) {
        // 4. ROLLBACK: Delete newly uploaded file if DB creation fails
        const fullPath = path.join("public", file.path);
        fs.unlink(fullPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting newly uploaded file:", unlinkErr);
        });

        // Propagate the error
        return next(
          new ErrorResponse(
            `Failed to process ${fieldName} upload: ${err.message}`,
            500
          )
        );
      }
    }
  }
};

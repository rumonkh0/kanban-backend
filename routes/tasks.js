import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createTask } from "../controllers/tasks.js";

const uploadDirectory = "public/uploads/tasks/";

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedImageExtensions = [".jpg", ".jpeg", ".png", ".gif"];
const allowedImageMimeTypes = ["image/jpeg", "image/png", "image/gif"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images") {
      const ext = path.extname(file.originalname).toLowerCase();
      const mimeType = file.mimetype;

      if (
        allowedImageExtensions.includes(ext) &&
        allowedImageMimeTypes.includes(mimeType)
      ) {
        cb(null, true); // Accept the image
      } else {
        cb(
          new Error(
            "Invalid file type. Only JPG, JPEG, PNG, and GIF images are allowed for the 'images' field."
          )
        );
      }
    } else if (file.fieldname === "files") {
      cb(null, true);
    } else {
      cb(new Error("Unexpected field."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB size limit for all files
  },
});

const uploadFields = upload.fields([
  { name: "images", maxCount: 10 },
  { name: "files", maxCount: 10 },
]);

const router = express.Router();

router.route("/").post(uploadFields, createTask);
export default router;

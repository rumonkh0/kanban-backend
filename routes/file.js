import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadFile, getFile, deleteFile } from "../controllers/files.js";

const router = express.Router();
const uploadDirectory = "public/uploads/";

// Ensure the directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// File upload endpoint
router.post("/upload", upload.single("file"), uploadFile);

// Get and delete file endpoints
router.route("/:id").get(getFile).delete(deleteFile);

export default router;

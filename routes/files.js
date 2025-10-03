import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  uploadFile,
  getFile,
  deleteFile,
  getFiles,
} from "../controllers/files.js";
import { protect } from "../middleware/auth.js";
import { get } from "http";

const router = express.Router();
const uploadDirectory = "public/uploads/files";

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
router.use(protect);
// File upload endpoint
router.post("/upload", upload.single("file"), uploadFile);

// Get and delete file endpoints
router.route("/:id").get(getFile).delete(deleteFile);
router.get("/", getFiles);

export default router;

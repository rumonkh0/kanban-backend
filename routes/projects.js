import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createProject } from "../controllers/projects.js";
import notes from "./notes.js";
import payments from "./payments.js";
import teamPayments from "./teamPayments.js";
import projectMembers from "./projectMembers.js";

const router = express.Router();

// Re-route into other resource routers
router.use("/:projectId/notes", notes);
router.use("/:projectId/payments", payments);
router.use("/:projectId/team-payments", teamPayments);
router.use("/:projectId/projectmembers", projectMembers);

const uploadDirectory = "public/uploads/project/";

// Ensure that the upload directory exists; if not, create it
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const allowedExtensions = [".jpg", ".jpeg", ".png"];

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images are allowed."));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB size limit
  },
});

const uploadFields = upload.fields([{ name: "relatedFiles", maxCount: 10 }]);

router.route("/").post(uploadFields, createProject);
export default router;

import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskOrder,
} from "../controllers/tasks.js";
import comments from "./comments.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });
router.use("/:taskId/comments", comments);

const uploadDirectory = "public/uploads/tasks/";

// Ensure that the upload directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

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
  // fileFilter: (req, file, cb) => {
  //   const ext = path.extname(file.originalname).toLowerCase();
  //   if (allowedExtensions.includes(ext)) {
  //     cb(null, true);
  //   } else {
  //     cb(new Error("Invalid file type. Only images are allowed."));
  //   }
  // },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB size limit
  },
});

const uploadFields = upload.fields([
  { name: "files", maxCount: 10 },
  { name: "images", maxCount: 10 },
  { name: "coverImage", maxCount: 1 },
]);

router.use(protect);
router.route("/").post(uploadFields, createTask).get(getTasks);
router.put("/:id/reorder", updateTaskOrder);
router
  .route("/:id")
  .get(getTask)
  .put(uploadFields, updateTask)
  .delete(deleteTask);

export default router;

import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  createFreelancer,
  getFreelancers,
  getFreelancer,
  updateFreelancer,
  deleteFreelancer,
} from "../controllers/freelancers.js";
import teamPayments from "./teamPayments.js";
import { authorize, protect } from "../middleware/auth.js";

const uploadDirectory = "public/uploads/freelancer/";

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

const uploadFields = upload.fields([{ name: "profilePicture", maxCount: 1 }]);

const router = express.Router();
router.use("/:projectId/team-payments", teamPayments);

router.use(protect);
// router.use(authorize("Admin"));
router
  .route("/")
  .get(getFreelancers)
  .post(uploadFields, authorize("Admin"), createFreelancer);

router
  .route("/:id")
  .get(getFreelancer)
  .put(uploadFields, authorize("Admin","Freelancer"), updateFreelancer)
  .delete(authorize("Admin"), deleteFreelancer);
export default router;

import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  createTeamPayment,
  getTeamPayments,
  getTeamPayment,
  updateTeamPayment,
  deleteTeamPayment,
} from "../controllers/teamPayments.js";
import { authorize, protect } from "../middleware/auth.js";

const uploadDirectory = "public/uploads/teamPayment/";

// Ensure that the upload directory exists; if not, create it
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB size limit
  },
});
const uploadFields = upload.fields([{ name: "relatedFile", maxCount: 1 }]);
const router = express.Router({ mergeParams: true });

router.use(protect);

router.route("/").post(uploadFields, createTeamPayment).get(getTeamPayments);

router
  .route("/:id")
  .get(getTeamPayment)
  .put(uploadFields, updateTeamPayment)
  .delete(deleteTeamPayment);
export default router;

import express from "express";
import path from "path";
import multer from "multer";
import {
  createClient,
  deleteClient,
  getClient,
  getClients,
  updateClient,
} from "../controllers/clients.js";
import fs from "fs";
import payments from "./payments.js";

const uploadDirectory = "public/uploads/client/";

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

const uploadFields = upload.fields([
  { name: "profilePicture", maxCount: 1 },
  { name: "companyLogo", maxCount: 1 },
]);

const router = express.Router();

router.use("/:projectId/payments", payments);

router.route("/").post(uploadFields, createClient).get(getClients);
router
  .route("/:id")
  .get(getClient)
  .put(uploadFields, updateClient)
  .delete(deleteClient);
export default router;

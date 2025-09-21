import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createPayment } from "../controllers/payments.js";

const uploadDirectory = "public/uploads/payment/";

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

const router = express.Router();

router.route("/").post(upload.single("relatedFile"), createPayment);
export default router;

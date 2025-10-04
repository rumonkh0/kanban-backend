import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  createPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
} from "../controllers/payments.js";

const uploadDirectory = "public/uploads/payment/";
import { authorize, protect } from "../middleware/auth.js";

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

router.use(protect, authorize("Admin"));
router.route("/").post(uploadFields, createPayment).get(getPayments);

router
  .route("/:id")
  .get(getPayment)
  .put(uploadFields, updatePayment)
  .delete(deletePayment);
export default router;

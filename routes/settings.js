import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import {
  getAdminSetting,
  editAdminSetting,
  getThemeSetting,
  editThemeSetting,
  getBusinessAddress,
  editBusinessAddress,
  getCompanySetting,
  editCompanySetting,
  getSecuritySetting,
  editSecuritySetting,
  getAllThemeSetting,
} from "../controllers/settings.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

const uploadDirectory = "public/uploads/setting/";

// Ensure that the upload directory exists; if not, create it
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

// const allowedExtensions = [".jpg", ".jpeg", ".png"];

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

router.route("/alltheme").get(getAllThemeSetting);
router.get("/security", getSecuritySetting);

router.use(protect, authorize("Admin"));

router
  .route("/admin")
  .get(getAdminSetting)
  .put(
    upload.fields([{ name: "profilePicture", maxCount: 1 }]),
    editAdminSetting
  );

// --- Theme Settings
router
  .route("/theme")
  .get(getThemeSetting)
  .put(
    upload.fields([
      { name: "lightModeLogo", maxCount: 1 },
      { name: "darkModeLogo", maxCount: 1 },
      { name: "loginBackgroundImage", maxCount: 1 },
      { name: "faviconImage", maxCount: 1 },
    ]),
    editThemeSetting
  );

router
  .route("/business-address")
  .get(getBusinessAddress)
  .put(editBusinessAddress);

// --- Company Settings
router.route("/company").get(getCompanySetting).put(editCompanySetting);

// --- Security Settings
router.route("/security").put(editSecuritySetting);

export default router;

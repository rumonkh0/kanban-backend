import express from "express";
import { createTracker } from "../controllers/trackers.js";
import multer from "multer";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();
router.use(protect)
// const upload = multer();

router.route("/").post(createTracker);

export default router;

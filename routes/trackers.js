import express from "express";
import { createTracker } from "../controllers/trackers.js";
import multer from "multer";

const router = express.Router();

const upload = multer();

router.route("/").post(upload.none(), createTracker);

export default router;

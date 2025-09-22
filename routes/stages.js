import express from "express";
import multer from "multer";
import { createStage } from "../controllers/stages.js";

const upload = multer();

const router = express.Router();

router.route("/").post(upload.none(), createStage);
export default router;

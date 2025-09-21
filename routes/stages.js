import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createStage } from "../controllers/stages.js";

const upload = multer();

const router = express.Router();

router.route("/").post(upload.none(), createStage);
export default router;

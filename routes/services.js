import express from "express";
import multer from "multer";
import { createService } from "../controllers/services.js";

const router = express.Router();

const upload = multer();

router.route("/").post(upload.none(), createService);

export default router;

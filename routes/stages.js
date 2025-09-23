import express from "express";
import {
  createStage,
  getStages,
  getStage,
  updateStage,
  deleteStage,
} from "../controllers/stages.js";

const router = express.Router();

router.route("/").post(createStage).get(getStages);

router.route("/:id").get(getStage).put(updateStage).delete(deleteStage);

export default router;

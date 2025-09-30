import express from "express";
import {
  createStage,
  getStages,
  getStage,
  updateStage,
  deleteStage,
  updateStageOrder,
} from "../controllers/stages.js";
import tasksRouter from "./tasks.js";

const router = express.Router({ mergeParams: true });

router.use("/:stageId/tasks", tasksRouter);

router.route("/").post(createStage).get(getStages);
router.put("/:id/reorder", updateStageOrder);
router.route("/:id").get(getStage).put(updateStage).delete(deleteStage);

export default router;

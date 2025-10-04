import express from "express";
import {
  createProjectActivity,
  getAllActivities,
  getActivitiesByProject,
  updateActivity,
  deleteActivity,
} from "../controllers/projectActivity.js";

import { authorize, protect } from "../middleware/auth.js";
const router = express.Router();

router.use(protect);
router.route("/").post(createProjectActivity).get(getAllActivities);

router.route("/:id").put(updateActivity).delete(deleteActivity);

router.route("/project/:projectId").get(getActivitiesByProject);

export default router;

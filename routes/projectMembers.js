// In projectMemberRoutes.js
import express from "express";
import {
  createProjectMember,
  getProjectMembers,
  getProjectMember,
  updateProjectMember,
  deleteProjectMember,
} from "../controllers/projectMembers.js";

import { authorize, protect } from "../middleware/auth.js";
const router = express.Router({ mergeParams: true });

router.use(protect);

router.route("/").post(createProjectMember).get(getProjectMembers);

router
  .route("/:id")
  .get(getProjectMember)
  .put(updateProjectMember)
  .delete(deleteProjectMember);

export default router;

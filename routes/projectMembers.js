// In projectMemberRoutes.js
import express from "express";
import {
  createProjectMember,
  getProjectMembers,
  getProjectMember,
  updateProjectMember,
  deleteProjectMember,
} from "../controllers/projectMembers.js";

const router = express.Router({ mergeParams: true });

router.route("/").post(createProjectMember).get(getProjectMembers);

router
  .route("/:id")
  .get(getProjectMember)
  .put(updateProjectMember)
  .delete(deleteProjectMember);

export default router;

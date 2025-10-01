import express from "express";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from "../controllers/comments.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });
router.use(protect);
router.route("/").post(createComment).get(getComments);
router.route("/:id").put(updateComment).delete(deleteComment);
export default router;

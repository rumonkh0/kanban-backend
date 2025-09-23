import express from "express";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from "../controllers/comments.js";

const router = express.Router({ mergeParams: true });

router.route("/").post(createComment).get(getComments);
router.route("/:id").put(updateComment).delete(deleteComment);
export default router;

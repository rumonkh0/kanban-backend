import express from "express";
import {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
} from "../controllers/notes.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

router.route("/").post(createNote).get(getNotes);

router.use(protect);
router
  .route("/:id")
  .get(getNote)
  .post(getNote)
  .put(updateNote)
  .delete(deleteNote);

export default router;

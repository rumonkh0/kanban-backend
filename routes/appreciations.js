import express from "express";
import {
  createAppreciation,
  getAppreciations,
  getAppreciation,
  updateAppreciation,
  deleteAppreciation,
} from "../controllers/appreciations.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.route("/").post(createAppreciation).get(getAppreciations);

router
  .route("/:id")
  .get(getAppreciation)
  .put(updateAppreciation)
  .delete(deleteAppreciation);

export default router;

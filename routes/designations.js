import express from "express";
import {
  createDesignation,
  getDesignations,
  getDesignation,
  updateDesignation,
  deleteDesignation,
} from "../controllers/designations.js";

import { authorize, protect } from "../middleware/auth.js";
const router = express.Router();

router.use(protect);
router.route("/").post(createDesignation).get(getDesignations);

router
  .route("/:id")
  .get(getDesignation)
  .put(authorize("Admin"), updateDesignation)
  .delete(authorize("Admin"), deleteDesignation);

export default router;

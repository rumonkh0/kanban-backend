import express from "express";
import {
  createDesignation,
  getDesignations,
  getDesignation,
  updateDesignation,
  deleteDesignation,
} from "../controllers/designations.js";

const router = express.Router();

router.route("/").post(createDesignation).get(getDesignations);

router
  .route("/:id")
  .get(getDesignation)
  .put(updateDesignation)
  .delete(deleteDesignation);

export default router;

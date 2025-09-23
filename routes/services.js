import express from "express";
import {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
} from "../controllers/services.js";

const router = express.Router();

router.route("/").post(createService).get(getServices);

router.route("/:id").get(getService).put(updateService).delete(deleteService);

export default router;

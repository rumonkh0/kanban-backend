import express from "express";
import {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
} from "../controllers/services.js";

import { authorize, protect } from "../middleware/auth.js";
const router = express.Router();

router.use(protect, authorize("Admin"));
router.route("/").post(createService).get(getServices);

router.route("/:id").get(getService).put(updateService).delete(deleteService);

export default router;

import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departments.js";

import { authorize, protect } from "../middleware/auth.js";
const router = express.Router();

router.use(protect);
router.route("/").post(createDepartment).get(getDepartments);

router
  .route("/:id")
  .get(getDepartment)
  .put(authorize("Admin"), updateDepartment)
  .delete(authorize("Admin"), deleteDepartment);

export default router;

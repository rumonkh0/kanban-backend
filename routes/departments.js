import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departments.js";

const router = express.Router();

router.route("/").post(createDepartment).get(getDepartments);

router
  .route("/:id")
  .get(getDepartment)
  .put(updateDepartment)
  .delete(deleteDepartment);

export default router;

import express from "express";
import {
  adminClients,
  adminOverview,
  adminProject,
  adminTask,
} from "../controllers/dashboard.js";

const router = express.Router();

router
  .get("/overview", adminOverview)
  .get("/client", adminClients)
  .get("/project", adminProject)
  .get("/task", adminTask);
export default router;

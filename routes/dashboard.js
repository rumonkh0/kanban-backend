import express from "express";
import {
  adminClients,
  adminOverview,
  adminProject,
  adminTask,
} from "../controllers/dashboard.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router
  .get("/overview", authorize("Admin"), adminOverview)
  .get("/client", authorize("Admin"), adminClients)
  .get("/project", authorize("Admin"), adminProject)
  .get("/task", authorize("Admin"), adminTask);
export default router;

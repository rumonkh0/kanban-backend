import express from "express";
import {
  adminClients,
  adminOverview,
  adminProject,
  adminTask,
  getClientPayment,
  getClientProject,
  getClientStat,
  getEarningsStatistics,
  getFinancepayment,
  getFreelancerStatistics,
  getFreelancerStatusCounts,
  getmemberProject,
  getOverviewDeadline,
  getOverviewPayment,
  getOverviewStat,
  getOverviewTaskstat,
  getPrivateDashboard,
  getProjectActivity,
  getProjectDeadline,
  getProjectEarningsSummary,
  getProjectStat,
  getTaskActivity,
  getTaskDeadline,
  getTaskStat,
  hr,
} from "../controllers/dashboard.js";
import { authorize, protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router
  .get("/private", authorize("Admin"), getPrivateDashboard)
  // Overview
  // .get("/overview", authorize("Admin"), adminOverview)
  .get("/overviewstat", authorize("Admin"), getOverviewStat)
  .get("/overviewfinance", authorize("Admin"), getOverviewPayment)
  .get("/overviewtasks", authorize("Admin"), getOverviewTaskstat)
  .get("/overviewdeadline", authorize("Admin"), getOverviewDeadline)

  //client
  // .get("/client", authorize("Admin"), adminClients)
  .get("/clientstat", authorize("Admin"), getClientStat)
  .get("/clientpayment", authorize("Admin"), getClientPayment)
  .get("/clientproject", authorize("Admin"), getClientProject)

  //project
  // .get("/project", authorize("Admin"), adminProject)
  .get("/projectstat", authorize("Admin"), getProjectStat)
  .get("/projectactivity", authorize("Admin"), getProjectActivity)
  .get("/projectdeadline", authorize("Admin"), getProjectDeadline)

  //task
  // .get("/task", authorize("Admin"), adminTask)
  .get("/taskstat", authorize("Admin"), getTaskStat)
  .get("/taskactivity", authorize("Admin"), getTaskActivity)
  .get("/taskdeadline", authorize("Admin"), getTaskDeadline)

  //hr
  .get("/hrstat", authorize("Admin"), getFreelancerStatistics)
  .get("/hraccountstat", authorize("Admin"), getFreelancerStatusCounts)
  .get("/memberproject", authorize("Admin"), getmemberProject)

  //Finance
  .get("/financestat", authorize("Admin"), getProjectEarningsSummary)
  .get("/financebytime", authorize("Admin"), getEarningsStatistics)
  .get("/financepayment", authorize("Admin"), getFinancepayment);

export default router;

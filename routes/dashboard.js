import express from "express";
import {
  getClientPayment,
  getClientProject,
  getClientProjectPayment,
  getClientProjectStats,
  getClientProjectStatusPie,
  getClientStat,
  getEarningsStatistics,
  getFinancepayment,
  getFreelancerEarningsStats,
  getFreelancerStatistics,
  getFreelancerStats,
  getFreelancerStatusCounts,
  getFreelancerTaskSummary,
  getmemberProject,
  getOverviewDeadline,
  getOverviewPayment,
  getOverviewStat,
  getOverviewTaskstat,
  getPrivateDashboard,
  getProjectActivity,
  getProjectDeadline,
  getProjectEarningsSummary,
  getProjectsReport,
  getProjectStat,
  getRevenueReport,
  getTaskActivity,
  getTaskCountByStage,
  getTaskDeadline,
  getTaskReport,
  getTaskStat,
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
  .get("/clientproject", authorize("Admin"), getClientProject)
  .get("/clientpayment", authorize("Admin"), getClientPayment)

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
  .get("/financepayment", authorize("Admin"), getFinancepayment)

  //Client
  .get("/client/:clientId/clientstat", getClientProjectStats)
  .get("/client/:clientId/clientproject", getClientProjectStatusPie)
  .get("/client/:clientId/clientpayment", getClientProjectPayment)

  //Freelancer
  .get("/freelancer/:freelancerId/freelancerstat", getFreelancerStats)
  .get("/freelancer/:freelancerId/freelancertask", getFreelancerTaskSummary)
  .get(
    "/freelancer/:freelancerId/freelancerearning",
    getFreelancerEarningsStats
  )

  //report
  .get("/taskreport", getTaskReport)
  .get("/taskrevenuereport", getRevenueReport)
  .get("/taskprojectreport", getProjectsReport)
  .get("/taskstagereport", getTaskCountByStage);

export default router;

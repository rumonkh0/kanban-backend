import asyncHandler from "../middleware/async.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import moment from "moment";

// @desc      Get admin dashboard
// @route     GET /api/v1/admin/dashboard
// @access    Private
export const adminOverview = asyncHandler(async (req, res, next) => {
  const revenue = await getTotalRevenue();
  const totalEarning = await getTotalRevenue();
  const deadlineTaskChart = await getDeadlineTaskChart();
  const paymentSummary = await getCombinedPaymentSummary();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: {
      revenue,
      totalEarning,
      deadlineTaskChart,
      paymentSummary,
    },
  });
});

export const adminClients = asyncHandler(async (req, res, next) => {
  const stats = await getClientStatistics();
  const paymentSummary = await getCombinedPaymentSummary();
  res.status(200).json({
    success: true,
    message: "Client dashboard found",
    data: {
      stats,
      paymentSummary,
    },
  });
});
export const adminProject = asyncHandler(async (req, res, next) => {
  const stats = await getProjectStatistics();
  const deadlineTaskChart = await getDeadlineTaskChart();
  const projectActivity = await getProjectActivity();
  res.status(200).json({
    success: true,
    message: "Client dashboard found",
    data: {
      stats,
      deadlineTaskChart,
      projectActivity,
    },
  });
});
export const adminTask = asyncHandler(async (req, res, next) => {
  const stats = await getProjectStatistics();
  const deadlineTaskChart = await getDeadlineTaskChart();
  const projectActivity = await getProjectActivity();
  res.status(200).json({
    success: true,
    message: "Client dashboard found",
    data: {
      stats,
      deadlineTaskChart,
      projectActivity,
    },
  });
});

// Query to calculate Total Revenue (Sum of all final billed amounts)
const getTotalRevenue = async () => {
  const result = await Project.aggregate([
    {
      $match: {
        archive: false,
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$finalAmountForClient" },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalRevenue : 0;
};

const countTaskDeadlines = (projects, dateKey, unit = "day") => {
  // Filter projects where the dueDate is within the unit of time specified by dateKey
  const filtered = projects.filter((t) =>
    moment(t.dueDate).isSame(dateKey, unit)
  );

  // Return the total count
  return {
    DeadlineCount: filtered.length,
  };
};

const getDeadlineTaskChart = async () => {
  console.log("hi");
  // Fetch all projects whose dueDate is within the last 12 months + current month
  const twelveMonthsAgo = moment()
    .subtract(12, "months")
    .startOf("month")
    .toDate();
  const projects = await Project.find({ dueDate: { $gte: twelveMonthsAgo } });

  // --- WEEK (Last 7 days) ---
  const weekData = [];
  for (let i = 6; i >= 0; i--) {
    const date = moment().subtract(i, "days");
    weekData.push({
      Key: date.format("ddd"), // e.g., 'Mon', 'Tue', 'Wed'
      ...countTaskDeadlines(projects, date, "day"),
    });
  }

  // --- MONTH (Last 30 days) ---
  const monthData = [];
  // Loop from 30 days back (i=30) up to 1 day back (i=1)
  for (let i = 30; i >= 1; i--) {
    const date = moment().subtract(i, "days");
    monthData.push({
      Key: date.format("D"), // e.g., '2', '3', '4' (day of month)
      ...countTaskDeadlines(projects, date, "day"),
    });
  }

  // --- YEAR (Last 12 months) ---
  const yearData = [];
  for (let i = 11; i >= 0; i--) {
    const date = moment().subtract(i, "months");

    const counts = countTaskDeadlines(projects, date, "month");

    yearData.push({
      Key: date.format("MMM"), // e.g., 'Jan', 'Feb', 'Mar'
      ...counts,
    });
  }

  return {
    week: weekData,
    month: monthData,
    year: yearData,
  };
};

// total paid and owed
const aggregateProjectFinancialTotals = async (startMoment) => {
  const startDate = startMoment.toDate();
  const now = moment().toDate();

  return await Project.aggregate([
    {
      $match: {
        // Filter projects based on their creation date
        createdAt: { $gte: startDate, $lte: now },
        // Exclude cancelled or irrelevant projects
        status: { $nin: ["Cancelled"] },
      },
    },
    {
      $group: {
        _id: null,
        // --- TEAM MEMBER Totals (Liability) ---
        totalPaidToMembers: { $sum: "$amountPaidToMembers" },
        totalOwedToMembers: { $sum: "$amountOwedToMembers" },

        // --- CLIENT Totals (Revenue/Receivables) ---
        totalPaidByClient: { $sum: "$amountPaidByClient" },
        totalOwedByClient: { $sum: "$amountOwedByClient" },
      },
    },
  ]);
};

// Helper to format the aggregated result into the desired array structure
const formatResult = (result) => {
  const data = result[0] || {};

  return {
    // Team Payment Summary
    team: [
      { key: "paid", value: data.totalPaidToMembers || 0 },
      { key: "owed", value: data.totalOwedToMembers || 0 },
    ],
    // Client Payment Summary
    client: [
      { key: "paid", value: data.totalPaidByClient || 0 },
      { key: "owed", value: data.totalOwedByClient || 0 },
    ],
  };
};

const getCombinedPaymentSummary = async () => {
  // --- 1. Define Time Ranges ---
  const weekStart = moment().subtract(7, "days").startOf("day");
  const monthStart = moment().subtract(30, "days").startOf("day");
  const yearStart = moment().subtract(12, "months").startOf("day");

  // --- 2. Execute Aggregations ---
  const [weekResult, monthResult, yearResult] = await Promise.all([
    aggregateProjectFinancialTotals(weekStart),
    aggregateProjectFinancialTotals(monthStart),
    aggregateProjectFinancialTotals(yearStart),
  ]);

  // --- 3. Format and Respond ---
  return {
    week: formatResult(weekResult),
    month: formatResult(monthResult),
    year: formatResult(yearResult),
  };
};

///// for client dashboard
const getClientStatistics = asyncHandler(async (req, res, next) => {
  // --- 1. Get Client Counts (Active/Inactive/Total) ---
  const clientCounts = await Client.aggregate([
    {
      $group: {
        _id: "$status", // Group by the "Active" or "Inactive" status
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        totalActive: {
          $sum: { $cond: [{ $eq: ["$_id", "Active"] }, "$count", 0] },
        },
        totalInactive: {
          $sum: { $cond: [{ $eq: ["$_id", "Inactive"] }, "$count", 0] },
        },
        totalClients: { $sum: "$count" },
      },
    },
    // Final projection to clean up the output
    { $project: { _id: 0 } },
  ]);

  // Extract results, defaulting to 0 if no clients are found
  const {
    totalActive = 0,
    totalInactive = 0,
    totalClients = 0,
  } = clientCounts[0] || {};

  // --- 2. Get Total Project Count ---
  const totalProjects = await Project.countDocuments({});

  // --- 3. Calculate Average Project Per Client ---
  // Avoid division by zero if there are no clients
  const avgProjectPerClient =
    totalClients > 0 ? totalProjects / totalClients : 0;

  // Round the average to two decimal places for cleaner display
  const formattedAvg = parseFloat(avgProjectPerClient.toFixed(2));

  // --- 4. Final Response Construction ---
  return {
    totalClients,
    totalActiveClients: totalActive,
    totalInactiveClients: totalInactive,
    totalProjects,
    avgProjectPerClient: formattedAvg,
  };
});

////// for project
const getProjectStatistics = asyncHandler(async (req, res, next) => {
  // --- 1. Get Project Status Counts ---
  const statusCounts = await Project.aggregate([
    {
      $group: {
        _id: "$status", // Group by the status field
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        // Calculate total count
        total: { $sum: "$count" },
        // Sum counts for specific statuses
        active: { $sum: { $cond: [{ $eq: ["$_id", "Active"] }, "$count", 0] } },
        onHold: {
          $sum: { $cond: [{ $eq: ["$_id", "On Hold"] }, "$count", 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$_id", "Completed"] }, "$count", 0] },
        },
      },
    },
    // Final projection to clean up the output
    { $project: { _id: 0 } },
  ]);

  // Extract results, defaulting to 0 if no projects are found
  const {
    total = 0,
    active = 0,
    onHold = 0,
    completed = 0,
  } = statusCounts[0] || {};

  // --- 2. Calculate Average Progress of Active Projects ---
  // The 'progress' field should be on the Project model (e.g., a number from 0 to 100).
  const avgProgressResult = await Project.aggregate([
    { $match: { status: "Active" } },
    {
      $group: {
        _id: null,
        averageProgress: { $avg: "$progress" },
      },
    },
    { $project: { _id: 0 } },
  ]);

  // Extract average progress, defaulting to 0
  const avgProgress = avgProgressResult[0]?.averageProgress || 0;

  // Format the average to a clean number (e.g., 75.50)
  const formattedProgress = parseFloat(avgProgress.toFixed(2));

  // --- 3. Final Response Construction ---
  return {
    totalProjects: total,
    activeProjects: active,
    onHoldProjects: onHold,
    completedProjects: completed,
    // Average progress percentage of all projects with status 'Active'
    avgActiveProjectProgress: formattedProgress,
  };
});

const getProjectActivity = asyncHandler(async (req, res, next) => {
  const twelveMonthsAgo = moment()
    .subtract(12, "months")
    .startOf("month")
    .toDate();

  // Fetch projects created or updated in last 12 months
  const projects = await Project.find({ createdAt: { $gte: twelveMonthsAgo } });

  // Helper to count by status
  const countByStatus = (items) => ({
    Active: items.filter((p) => p.status === "active").length,
    Completed: items.filter((p) => p.status === "completed").length,
    Onhold: items.filter((p) => p.status === "onhold").length,
  });

  // Week (last 7 days)
  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = moment().subtract(i, "days");
    const filtered = projects.filter((p) =>
      moment(p.createdAt).isSame(date, "day")
    );
    week.push({
      Key: date.format("DD MMM"),
      ...countByStatus(filtered),
    });
  }

  // Month (last 30 days)
  const month = [];
  for (let i = 29; i >= 0; i--) {
    const date = moment().subtract(i, "days");
    const filtered = projects.filter((p) =>
      moment(p.createdAt).isSame(date, "day")
    );
    month.push({
      Key: date.format("DD MMM"),
      ...countByStatus(filtered),
    });
  }

  // Year (last 12 months)
  const year = [];
  for (let i = 11; i >= 0; i--) {
    const date = moment().subtract(i, "months");
    const filtered = projects.filter((p) =>
      moment(p.createdAt).isSame(date, "month")
    );
    year.push({
      Key: date.format("MMM YYYY"),
      ...countByStatus(filtered),
    });
  }

  return {
    week,
    month,
    year,
  };
});

import asyncHandler from "../middleware/async.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import moment from "moment";
import Task from "../models/Task.js";
import Freelancer from "../models/Freelancer.js";
import TeamPayment from "../models/TeamPayment.js";
import Payment from "../models/Payment.js";
import Appreciation from "../models/Appreciation.js";
import mongoose from "mongoose";
import ProjectMember from "../models/ProjectMember.js";
import Stage from "../models/Stage.js";

// @desc      Get admin dashboard
// @route     GET /api/v1/admin/dashboard/private
// @access    Private
export const getPrivateDashboard = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    // 1️⃣ Project & Task Stats
    const [pendingTasks, overdueTasks, activeProjects, overdueProjects] =
      await Promise.all([
        // Pending tasks (started but not yet completed)
        Task.countDocuments({
          startDate: { $lte: today },
          $or: [{ completionDate: null }, { completionDate: { $gt: today } }],
        }),

        // Overdue tasks (due date passed and not completed)
        Task.countDocuments({
          $expr: {
            $and: [
              { $lt: ["$dueDate", today] },
              {
                $or: [
                  { $eq: ["$completionDate", null] },
                  { $gt: ["$completionDate", "$dueDate"] },
                ],
              },
            ],
          },
        }),

        // Active projects (ongoing)
        Project.countDocuments({
          startDate: { $lte: today },
          $or: [{ completionDate: null }, { completionDate: { $gt: today } }],
        }),

        // Overdue projects (due date passed and not completed)
        Project.countDocuments({
          $expr: {
            $and: [
              { $lt: ["$dueDate", today] },
              {
                $or: [
                  { $eq: ["$completionDate", null] },
                  { $gt: ["$completionDate", "$dueDate"] },
                ],
              },
            ],
          },
        }),
      ]);

    // 2️⃣ Upcoming Birthdays (clients + freelancers)
    const upcomingClientBirthdays = await Client.find({
      dob: { $exists: true, $ne: null },
      $expr: {
        $lte: [
          {
            $mod: [
              {
                $add: [
                  {
                    $subtract: [{ $dayOfYear: "$dob" }, { $dayOfYear: today }],
                  },
                  365,
                ],
              },
              365,
            ],
          },
          30,
        ],
      },
    })
      .sort({ dob: 1 })
      .limit(2);

    const upcomingFreelancerBirthdays = await Freelancer.find({
      dob: { $exists: true, $ne: null },
      $expr: {
        $lte: [
          {
            $mod: [
              {
                $add: [
                  {
                    $subtract: [{ $dayOfYear: "$dob" }, { $dayOfYear: today }],
                  },
                  365,
                ],
              },
              365,
            ],
          },
          30,
        ],
      },
    })
      .sort({ dob: 1 })
      .limit(2);

    // 🎂 Fallbacks: if no birthdays in next 30 days, just show next two
    const clientBirthdays =
      upcomingClientBirthdays.length > 0
        ? upcomingClientBirthdays
        : await Client.find({ dob: { $exists: true, $ne: null } })
            .populate("profilePicture", "filePath")
            .sort({ dob: 1 })
            .limit(2);

    const freelancerBirthdays =
      upcomingFreelancerBirthdays.length > 0
        ? upcomingFreelancerBirthdays
        : await Freelancer.find({ dob: { $exists: true, $ne: null } })
            .populate("profilePicture", "filePath")
            .sort({ dob: 1 })
            .limit(2);

    // 3️⃣ Last 2 Appreciations
    const lastAppreciations = await Appreciation.find()
      .populate({
        path: "givenTo",
        select: "name role profilePicture",
        populate: { path: "profilePicture", select: "filePath" },
      })
      .sort({ date: -1 })
      .limit(2);
    // 5️⃣ Today's Joining
    const todaysJoining = await Freelancer.find({
      $expr: {
        $and: [
          { $eq: [{ $dayOfMonth: "$joiningDate" }, today.getDate()] },
          { $eq: [{ $month: "$joiningDate" }, today.getMonth() + 1] },
        ],
      },
    }).limit(2);

    // 6️⃣ Notice Period Ending (next 30 days)
    const noticePeriodEnding = await Freelancer.find({
      noticePeriodEndDate: { $gte: startOfDay, $lte: next30Days },
    }).limit(2);

    // 7️⃣ Probation Ending (next 30 days)
    const probationEnding = await Freelancer.find({
      probationEndDate: { $gte: startOfDay, $lte: next30Days },
    }).limit(2);

    // ✅ Return dashboard
    res.json({
      success: true,
      data: {
        tasks: { pendingTasks, overdueTasks },
        projects: { activeProjects, overdueProjects },
        birthdays: {
          clients: clientBirthdays,
          freelancers: freelancerBirthdays,
        },
        lastAppreciations,
        todaysJoining,
        noticePeriodEnding,
        probationEnding,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Overview
export const getOverviewStat = asyncHandler(async (req, res, next) => {
  const d = await earningsSummary();
  const data = await getMonthlyRevenueAndEarnings();
  const totalActiveFreelancers = await Freelancer.countDocuments({
    status: "Active",
  });

  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: {
      toBePaid: d.toBePaid,
      totalEarnings: data.thisMonth.earnings,
      revenue: data.thisMonth.revenue,
      totalActiveFreelancers,
    },
  });
});

export const getOverviewPayment = asyncHandler(async (req, res, next) => {
  const paymentSummary = await aggregateProjectFinancialTotals();
  const data = formatResult(paymentSummary);
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data,
  });
});

export const getOverviewTaskstat = asyncHandler(async (req, res, next) => {
  const data = await getProjectTaskActivity(Task);
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data,
  });
});

export const getOverviewDeadline = asyncHandler(async (req, res, next) => {
  const deadlineTaskChart = await getDeadlineTaskChart();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: deadlineTaskChart,
  });
});

export const adminOverview = asyncHandler(async (req, res, next) => {
  const revenue = await getTotalRevenue();
  const totalEarning = await getTotalRevenue();
  const totalActiveFreelancers = await Freelancer.countDocuments({
    status: "Active",
  });

  const deadlineTaskChart = await getDeadlineTaskChart();
  const paymentSummary = await aggregateProjectFinancialTotals();
  const taskStatus12 = await getLast12MonthsTaskStatus();
  const taskStatus7 = await getLast7DaysTaskStatus();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: {
      revenue,
      totalEarning,
      totalActiveFreelancers,
      paymentSummary: formatResult(paymentSummary),
      tastStatus: { week: taskStatus7, month: taskStatus12 },
      deadlineTaskChart,
    },
  });
});

//client

export const getClientStat = asyncHandler(async (req, res, next) => {
  const stats = await getClientStatistics();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: stats,
  });
});

export const getClientPayment = asyncHandler(async (req, res, next) => {
  const paymentSummary = await aggregateProjectFinancialTotals();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: paymentSummary[0],
  });
});

export const getClientProject = asyncHandler(async (req, res, next) => {
  const projectActivity = await getProjectTaskActivity(Project);
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: projectActivity,
  });
});

export const adminClients = asyncHandler(async (req, res, next) => {
  const stats = await getClientStatistics();
  const paymentSummary = await aggregateProjectFinancialTotals();
  const projectActivity = await getProjectTaskActivity(Project);
  res.status(200).json({
    success: true,
    message: "Client dashboard found",
    data: {
      stats,
      paymentSummary,
      projectActivity,
    },
  });
});

//Project

export const getProjectStat = asyncHandler(async (req, res, next) => {
  const stats = await getProjectStatistics();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: stats,
  });
});

export const getProjectActivity = asyncHandler(async (req, res, next) => {
  const projectActivity = await getProjectTaskActivity(Project);
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: projectActivity,
  });
});

export const getProjectDeadline = asyncHandler(async (req, res, next) => {
  const deadlineTaskChart = await getDeadlineTaskChart();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: deadlineTaskChart,
  });
});

export const adminProject = asyncHandler(async (req, res, next) => {
  const stats = await getProjectStatistics();
  const deadlineTaskChart = await getDeadlineTaskChart();
  const projectActivity = await getProjectTaskActivity(Project);
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

//task

export const getTaskStat = asyncHandler(async (req, res, next) => {
  const stats = await getTaskStatistics();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: stats,
  });
});

export const getTaskActivity = asyncHandler(async (req, res, next) => {
  const projectActivity = await getProjectTaskActivity(Task);
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: projectActivity,
  });
});

export const getTaskDeadline = asyncHandler(async (req, res, next) => {
  const deadlineTaskChart = await getDeadlineTaskChart();
  res.status(200).json({
    success: true,
    message: "dashboard found",
    data: deadlineTaskChart,
  });
});

export const adminTask = asyncHandler(async (req, res, next) => {
  const stats = await getTaskStatistics();
  const projectActivity = await getProjectTaskActivity(Task);
  const deadlineTaskChart = await getDeadlineTaskChart();
  res.status(200).json({
    success: true,
    message: "task dashboard found",
    data: {
      stats,
      projectActivity,
      deadlineTaskChart,
    },
  });
});

export const hr = asyncHandler(async (req, res, next) => {
  const stats = await getProjectStatistics();
  const projectActivity = await getProjectTaskActivity(Task);
  const deadlineTaskChart = await getDeadlineTaskChart();
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
  // console.log("hi");
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
const aggregateProjectFinancialTotals = async (
  startMoment = null,
  clientId = null,
  projectId = null
) => {
  const now = new Date();
  const matchStage = {
    status: { $nin: ["Cancelled"] },
  };

  // Optional date filter
  if (startMoment) {
    matchStage.createdAt = { $gte: startMoment.toDate(), $lte: now };
  }

  // Optional client filter
  if (clientId) {
    matchStage.client = new mongoose.Types.ObjectId(clientId);
  }
  if (projectId) {
    matchStage.project = new mongoose.Types.ObjectId(projectId);
  }

  return await Project.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalPaidToMembers: { $sum: "$amountPaidToMembers" },
        totalOwedToMembers: { $sum: "$amountOwedToMembers" },
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

////// for task
const getTaskStatistics = asyncHandler(async (req, res) => {
  const todayStart = moment().startOf("day").toDate();
  const todayEnd = moment().endOf("day").toDate();
  const monthStart = moment().startOf("month").toDate();
  const monthEnd = moment().endOf("month").toDate();

  const stats = await Task.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },

        // Active today
        active: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lte: ["$startDate", todayEnd] },
                  {
                    $or: [
                      { $eq: ["$completionDate", null] },
                      { $gt: ["$completionDate", todayEnd] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },

        // Due today
        due: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$dueDate", todayStart] },
                  { $lte: ["$dueDate", todayEnd] },
                ],
              },
              1,
              0,
            ],
          },
        },

        // Overdue tasks (past due, not completed)
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", todayStart] },
                  {
                    $or: [
                      { $eq: ["$completionDate", null] },
                      { $gt: ["$completionDate", "$dueDate"] },
                    ],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },

        // Completed this month
        completed: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$completionDate", monthStart] },
                  { $lte: ["$completionDate", monthEnd] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const {
    total = 0,
    active = 0,
    completed = 0,
    due = 0,
    overdue = 0,
  } = stats[0] || {};

  return {
    totalTasks: total,
    activeTasks: active,
    completedTasks: completed,
    dueTasks: due,
    overdueTasks: overdue,
  };
});

// const getProjectTaskActivity = asyncHandler(
//   async (model, clientId = null, memberId = null) => {
//     const twelveMonthsAgo = moment()
//       .subtract(12, "months")
//       .startOf("month")
//       .toDate();

//     //   // Build filter
//     const filter = { createdAt: { $gte: twelveMonthsAgo } };
//     if (clientId) filter.client = clientId; // optional client filter
//     if (memberId) filter.members = memberId; // optional client filter

//     // Fetch projects (all or specific client)
//     const projects = await model.find(filter);

//     // Helper: count active, completed, due, overdue for a given date range
//     const countByDate = (projects, date, unit = "day") => {
//       let startRange, endRange;

//       if (unit === "day") {
//         startRange = date.clone().startOf("day");
//         endRange = date.clone().endOf("day");
//       } else if (unit === "month") {
//         startRange = date.clone().startOf("month");
//         endRange = date.clone().endOf("month");
//       } else {
//         throw new Error("Unsupported unit for countByDate");
//       }

//       let active = 0,
//         completed = 0,
//         due = 0,
//         overdue = 0;

//       projects.forEach((p) => {
//         const start = p.startDate ? moment(p.startDate) : null;
//         const dueDate = p.dueDate ? moment(p.dueDate) : null;
//         const completion = p.completionDate ? moment(p.completionDate) : null;

//         // --- Completed ---
//         if (
//           completion &&
//           completion.isBetween(startRange, endRange, null, "[]")
//         ) {
//           completed++;
//         }

//         // --- Due ---
//         if (dueDate && dueDate.isBetween(startRange, endRange, null, "[]")) {
//           due++;
//         }

//         // --- Active ---
//         // A task is active if:
//         // It started on/before this day, and not yet completed before this day
//         if (
//           start &&
//           start.isSameOrBefore(endRange) &&
//           (!completion || completion.isAfter(endRange))
//         ) {
//           active++;
//         }

//         // --- Overdue ---
//         if (
//           dueDate &&
//           dueDate.isSameOrBefore(endRange) &&
//           (!completion || completion.isAfter(endRange))
//         ) {
//           overdue++;
//         }
//       });

//       return { active, completed, due, overdue };
//     };

//     // --- Last 7 days ---
//     const week = [];
//     for (let i = 6; i >= 0; i--) {
//       const date = moment().subtract(i, "days");
//       week.push({
//         Key: date.format("ddd"),
//         ...countByDate(projects, date, "day"),
//       });
//     }

//     // --- Last 30 days ---
//     const month = [];
//     for (let i = 29; i >= 0; i--) {
//       const date = moment().subtract(i, "days");
//       month.push({
//         Key: date.format("DD"),
//         ...countByDate(projects, date, "day"),
//       });
//     }

//     // --- Last 12 months ---
//     const year = [];
//     for (let i = 11; i >= 0; i--) {
//       const date = moment().subtract(i, "months");
//       year.push({
//         Key: date.format("MMM"),
//         ...countByDate(projects, date, "month"),
//       });
//     }

//     return { week, month, year };
//   }
// );

const getProjectTaskActivity = asyncHandler(
  async (model, clientId = null, memberId = null) => {
    // Current Time: Monday, October 6, 2025 (Assuming this is 'now' for calculations)
    const twelveMonthsAgo = moment()
      .subtract(12, "months")
      .startOf("month")
      .toDate();

    //   // Build filter
    const filter = { createdAt: { $gte: twelveMonthsAgo } };
    if (clientId) filter.client = clientId; // optional client filter
    if (memberId) filter.members = memberId; // optional member filter (Note: your filter is 'members', not 'memberId')

    // Fetch tasks (all or specific client/member) - Renamed 'projects' to 'tasks' internally for clarity
    const tasks = await model.find(filter);

    // Helper: count active, completed, due, overdue for a given date range
    const countByDate = (tasks, date, unit = "day") => {
      let startRange, endRange;

      if (unit === "day") {
        startRange = date.clone().startOf("day");
        endRange = date.clone().endOf("day");
      } else if (unit === "month") {
        startRange = date.clone().startOf("month");
        endRange = date.clone().endOf("month");
      } else {
        throw new Error("Unsupported unit for countByDate");
      }

      let active = 0,
        completed = 0,
        due = 0,
        overdue = 0;

      tasks.forEach((p) => {
        // Use startDate if available, otherwise fall back to createdAt (based on schema default)
        const start = moment(p.startDate || p.createdAt);
        const dueDate = p.dueDate ? moment(p.dueDate) : null;
        const completion = p.completionDate ? moment(p.completionDate) : null;

        // 1. Completed: completion happened within the range [startRange, endRange]
        if (
          completion &&
          completion.isBetween(startRange, endRange, null, "[]")
        ) {
          completed++;
        }

        // 2. Due: due date happened within the range [startRange, endRange]
        if (dueDate && dueDate.isBetween(startRange, endRange, null, "[]")) {
          due++;
        }

        // 3. Active: Project started on or before the end date (endRange) AND
        //    it was NOT completed before the start date (startRange).
        //    This counts tasks that were active at any point during the period.
        const isCompletedBeforeStart =
          completion && completion.isBefore(startRange);
        if (start.isSameOrBefore(endRange) && !isCompletedBeforeStart) {
          active++;
        }

        // 4. Overdue: Due date is on or before the end date (endRange) AND
        //    it was NOT completed by the end date (endRange).
        if (
          dueDate &&
          dueDate.isSameOrBefore(endRange) &&
          (!completion || completion.isAfter(endRange))
        ) {
          overdue++;
        }
      });

      return { active, completed, due, overdue };
    };

    // ------------------------------------------------------------------------------------------------

    // --- Last 7 days Trend ---
    const week = [];
    const weekStart = moment().subtract(6, "days").startOf("day");
    const weekEnd = moment().endOf("day");
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, "days");
      week.push({
        Key: date.format("ddd"),
        ...countByDate(tasks, date, "day"),
      });
    }

    // --- Last 30 days Trend ---
    const month = [];
    const monthStart = moment().subtract(29, "days").startOf("day");
    const monthEnd = moment().endOf("day");
    for (let i = 29; i >= 0; i--) {
      const date = moment().subtract(i, "days");
      month.push({
        Key: date.format("DD"),
        ...countByDate(tasks, date, "day"),
      });
    }

    // --- Last 12 months Trend ---
    const year = [];
    const yearStart = moment().subtract(11, "months").startOf("month");
    const yearEnd = moment().endOf("month");
    for (let i = 11; i >= 0; i--) {
      const date = moment().subtract(i, "months");
      year.push({
        Key: date.format("MMM"),
        ...countByDate(tasks, date, "month"),
      });
    }

    // ------------------------------------------------------------------------------------------------

    // --- Distinct Project/Task Summary for the whole period ---
    const getDistinctSummary = (tasks, startPeriod, endPeriod) => {
      // Filter tasks that were active, due, or completed within the whole period
      const relevantTasks = tasks.filter((p) => {
        const start = moment(p.startDate || p.createdAt);
        const completion = p.completionDate ? moment(p.completionDate) : null;

        // Task was open during the period (Started before end, and completed after start/not completed)
        const wasOpenInPeriod =
          start.isSameOrBefore(endPeriod) &&
          (!completion || completion.isAfter(startPeriod));

        // Task was completed in the period
        const wasCompletedInPeriod =
          completion &&
          completion.isBetween(startPeriod, endPeriod, null, "[]");

        // Task was created in the period (for completeness)
        const wasCreatedInPeriod = moment(p.createdAt).isBetween(
          startPeriod,
          endPeriod,
          null,
          "[]"
        );

        return wasOpenInPeriod || wasCompletedInPeriod || wasCreatedInPeriod;
      });

      return relevantTasks.length;
    };

    const summary = {
      week: getDistinctSummary(tasks, weekStart, weekEnd),
      month: getDistinctSummary(tasks, monthStart, monthEnd),
      year: getDistinctSummary(tasks, yearStart, yearEnd),
    };

    return { week, month, year, summary };
  }
);

const getLast12MonthsTaskStatus = asyncHandler(async () => {
  const today = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthData = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthStats = await Project.aggregate([
      {
        $facet: {
          complete: [
            {
              $match: {
                completionDate: { $gte: monthStart, $lte: monthEnd },
              },
            },
            { $count: "count" },
          ],
          active: [
            {
              $match: {
                startDate: { $lte: monthEnd },
                dueDate: { $gte: monthStart },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: monthEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
          due: [
            {
              $match: {
                dueDate: { $gte: monthStart, $lte: monthEnd },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: monthEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: monthStart },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: monthEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    monthData.push({
      key: months[monthStart.getMonth()],
      complete: monthStats[0].complete[0]?.count || 0,
      active: monthStats[0].active[0]?.count || 0,
      due: monthStats[0].due[0]?.count || 0,
      overdue: monthStats[0].overdue[0]?.count || 0,
    });
  }

  return monthData;
});

const getLast7DaysTaskStatus = asyncHandler(async () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekData = [];

  for (let i = 6; i >= 0; i--) {
    const dayEnd = new Date(today);
    dayEnd.setDate(today.getDate() - i);

    const dayStart = new Date(dayEnd);
    dayStart.setHours(0, 0, 0, 0);
    dayEnd.setHours(23, 59, 59, 999);

    const dayStats = await Project.aggregate([
      {
        $facet: {
          complete: [
            {
              $match: {
                completionDate: { $gte: dayStart, $lte: dayEnd },
              },
            },
            { $count: "count" },
          ],
          active: [
            {
              $match: {
                startDate: { $lte: dayEnd },
                dueDate: { $gte: dayStart },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: dayEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
          due: [
            {
              $match: {
                dueDate: { $gte: dayStart, $lte: dayEnd },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: dayEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: dayStart },
                $or: [
                  { completionDate: null },
                  { completionDate: { $gt: dayEnd } },
                ],
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    const dayOfWeek = days[dayStart.getDay()];

    weekData.push({
      key: dayOfWeek,
      complete: dayStats[0].complete[0]?.count || 0,
      active: dayStats[0].active[0]?.count || 0,
      due: dayStats[0].due[0]?.count || 0,
      overdue: dayStats[0].overdue[0]?.count || 0,
    });
  }

  return weekData;
});

const getMonthlyRevenueAndEarnings = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(startOfThisMonth);

  // ---------- THIS MONTH ----------
  const [thisMonthRevenue] = await Payment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startOfThisMonth, $lte: now },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountPaid" },
      },
    },
  ]);

  const [thisMonthExpenses] = await TeamPayment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startOfThisMonth, $lte: now },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountPaid" },
      },
    },
  ]);

  // ---------- PREVIOUS MONTH ----------
  const [prevMonthRevenue] = await Payment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startOfLastMonth, $lt: endOfLastMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountPaid" },
      },
    },
  ]);

  const [prevMonthExpenses] = await TeamPayment.aggregate([
    {
      $match: {
        paymentDate: { $gte: startOfLastMonth, $lt: endOfLastMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountPaid" },
      },
    },
  ]);

  // ---------- CALCULATE ----------
  const thisMonthRevenueValue = thisMonthRevenue?.total || 0;
  const thisMonthExpensesValue = thisMonthExpenses?.total || 0;

  const prevMonthRevenueValue = prevMonthRevenue?.total || 0;
  const prevMonthExpensesValue = prevMonthExpenses?.total || 0;

  const thisMonthEarnings = thisMonthRevenueValue - thisMonthExpensesValue;
  const prevMonthEarnings = prevMonthRevenueValue - prevMonthExpensesValue;

  const calcGrowth = (current, prev) =>
    prev === 0 ? (current > 0 ? 100 : 0) : ((current - prev) / prev) * 100;

  const revenueGrowth = calcGrowth(
    thisMonthRevenueValue,
    prevMonthRevenueValue
  );
  const earningsGrowth = calcGrowth(thisMonthEarnings, prevMonthEarnings);

  const data = {
    thisMonth: {
      revenue: thisMonthRevenueValue,
      earnings: thisMonthRevenueValue - thisMonthExpensesValue,
    },
    previousMonth: {
      revenue: prevMonthRevenueValue,
      earnings: prevMonthRevenueValue - prevMonthExpensesValue,
    },
    growth: {
      revenue: revenueGrowth.toFixed(2),
      earnings: earningsGrowth.toFixed(2),
    },
  };

  return data;
});

//  for HR section
export const getFreelancerStatistics = asyncHandler(async (req, res) => {
  // 1️⃣ Total members & active members
  const [totalMembers, totalActiveMembers] = await Promise.all([
    Freelancer.countDocuments(),
    Freelancer.countDocuments({ accountStatus: "Active" }),
  ]);

  // 2️⃣ Total tasks assigned to members
  // Task.members is an array of ObjectIds
  const taskAggregation = await Task.aggregate([
    { $unwind: "$members" }, // flatten the array
    {
      $group: {
        _id: "$members",
        taskCount: { $sum: 1 }, // count tasks per member
      },
    },
  ]);

  // Sum all tasks
  const totalTasksAssigned = taskAggregation.reduce(
    (acc, curr) => acc + curr.taskCount,
    0
  );

  // 3️⃣ Average tasks per member
  const averageTasksPerMember =
    totalMembers > 0 ? totalTasksAssigned / totalMembers : 0;

  res.status(200).json({
    sucess: true,
    data: {
      totalMembers,
      totalActiveMembers,
      totalTasksAssigned,
      averageTasksPerMember: Number(averageTasksPerMember.toFixed(2)), // round to 2 decimals
    },
  });
});

export const getFreelancerStatusCounts = asyncHandler(async (req, res) => {
  const stats = await Freelancer.aggregate([
    {
      $group: {
        _id: "$accountStatus",
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$count" },
        active: {
          $sum: { $cond: [{ $eq: ["$_id", "Active"] }, "$count", 0] },
        },
        inactive: {
          $sum: { $cond: [{ $eq: ["$_id", "Inactive"] }, "$count", 0] },
        },
        onLeave: {
          $sum: { $cond: [{ $eq: ["$_id", "On Leave"] }, "$count", 0] },
        },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const { total = 0, active = 0, inactive = 0, onLeave = 0 } = stats[0] || {};

  res.status(200).json({
    total,
    data: [
      { Key: "active", value: active || 0 },
      { Key: "inactive", value: inactive || 0 },
      { Key: "onLeave", value: onLeave || 0 },
    ],
  });
});

export const getmemberProject = asyncHandler(async (req, res, next) => {
  const stats = await getProjectTaskActivity(Project, req.params.memberId);
  res.status(200).json({
    success: true,
    data: stats,
  });
});

const earningsSummary = asyncHandler(async () => {
  const agg = await Project.aggregate([
    {
      $group: {
        _id: null,
        // Revenue received from client
        revenue: { $sum: "$finalAmountForClient" },
        // Total paid to team members
        totalPaidToMembers: { $sum: "$amountPaidToMembers" },
        // Total amount that should still be paid to members
        totalOwedToMembers: { $sum: "$amountPayableToMembers" },
      },
    },
  ]);

  const revenue = agg[0]?.revenue || 0;
  const totalPaidToMembers = agg[0]?.totalPaidToMembers || 0;
  const totalOwedToMembers = agg[0]?.totalOwedToMembers || 0;

  const totalEarnings = revenue - totalPaidToMembers; // net profit
  const toBePaid = totalOwedToMembers; // pending payment to team
  // revenue is just total received from client

  return {
    totalEarnings,
    toBePaid,
    revenue,
  };
});

//For Finance
export const getProjectEarningsSummary = asyncHandler(async (req, res) => {
  const agg = await earningsSummary();
  const data = await getMonthlyRevenueAndEarnings();

  res.status(200).json({
    success: true,
    data: {
      toBePaid: agg.toBePaid,
      totalEarnings: data.thisMonth.earnings,
      revenue: data.thisMonth.revenue,
    },
  });
});

export const getEarningsStatistics = asyncHandler(async (req, res, next) => {
  const today = moment().endOf("day").toDate();

  const aggregatePayments = async (Model, startDate, groupBy = "day") => {
    let groupId = {};

    if (groupBy === "day") {
      groupId = {
        date: { $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" } },
      };
    } else if (groupBy === "month") {
      groupId = {
        month: { $month: "$paymentDate" },
        year: { $year: "$paymentDate" },
      };
    }

    const agg = await Model.aggregate([
      { $match: { paymentDate: { $gte: startDate, $lte: today } } },
      { $group: { _id: groupId, total: { $sum: "$amountPaid" } } },
      { $sort: { "_id.date": 1, "_id.year": 1, "_id.month": 1 } },
    ]);

    return agg;
  };

  const fillMissingDays = (startDate, daysCount, aggData) => {
    const result = [];
    for (let i = 0; i < daysCount; i++) {
      const date = moment(startDate).add(i, "days");
      const data = aggData.find((d) => moment(d._id.date).isSame(date, "day"));
      result.push({
        key: date.format("ddd"), // Mon, Tue, ...
        value: data ? data.total : 0,
      });
    }
    return result;
  };

  const fillMissingDaysNumbers = (startDate, daysCount, aggData) => {
    const result = [];
    for (let i = 0; i < daysCount; i++) {
      const date = moment(startDate).add(i, "days");
      const data = aggData.find((d) => moment(d._id.date).isSame(date, "day"));
      result.push({
        key: date.date().toString(), // 1, 2, 3, ...
        value: data ? data.total : 0,
      });
    }
    return result;
  };

  const fillMissingMonths = (startDate, monthsCount, aggData) => {
    const result = [];
    for (let i = 0; i < monthsCount; i++) {
      const date = moment(startDate).add(i, "months");
      const data = aggData.find(
        (d) => d._id.month === date.month() + 1 && d._id.year === date.year()
      );
      result.push({
        key: date.format("MMM"), // Jan, Feb, ...
        value: data ? data.total : 0,
      });
    }
    return result;
  };

  // --- Last 7 days (Mon-Sun) ---
  const sevenDaysAgo = moment().subtract(6, "days").startOf("day").toDate();
  const clientWeek = await aggregatePayments(Payment, sevenDaysAgo, "day");
  const teamWeek = await aggregatePayments(TeamPayment, sevenDaysAgo, "day");

  const week = fillMissingDays(sevenDaysAgo, 7, clientWeek).map((c) => {
    const t = teamWeek.find((t) =>
      moment(t._id.date).isSame(moment().day(c.key), "day")
    );
    return { key: c.key, value: c.value - (t ? t.total : 0) };
  });

  // --- Last 30 days (1-30) ---
  const thirtyDaysAgo = moment().subtract(29, "days").startOf("day").toDate();
  const clientMonthAgg = await aggregatePayments(Payment, thirtyDaysAgo, "day");
  const teamMonthAgg = await aggregatePayments(
    TeamPayment,
    thirtyDaysAgo,
    "day"
  );

  const month = fillMissingDaysNumbers(thirtyDaysAgo, 30, clientMonthAgg).map(
    (c) => {
      const t = teamMonthAgg.find(
        (t) => moment(t._id.date).date() === parseInt(c.key)
      );
      return { key: c.key, value: c.value - (t ? t.total : 0) };
    }
  );

  // --- Last 12 months (Jan-Dec) ---
  const twelveMonthsAgo = moment()
    .subtract(11, "months")
    .startOf("month")
    .toDate();
  const clientYearAgg = await aggregatePayments(
    Payment,
    twelveMonthsAgo,
    "month"
  );
  const teamYearAgg = await aggregatePayments(
    TeamPayment,
    twelveMonthsAgo,
    "month"
  );

  const year = fillMissingMonths(twelveMonthsAgo, 12, clientYearAgg).map(
    (c) => {
      const t = teamYearAgg.find(
        (t) =>
          t._id.month === moment(c.key, "MMM").month() + 1 &&
          t._id.year === moment(c.key, "MMM").year()
      );
      return { key: c.key, value: c.value - (t ? t.total : 0) };
    }
  );

  res.status(200).json({ success: true, data: { week, month, year } });
});

export const getFinancepayment = asyncHandler(async (req, res) => {
  const data = await aggregateProjectFinancialTotals();

  res.status(200).json({
    success: true,
    data: data[0],
  });
});

//for Client

export const getClientProjectStats = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res
      .status(400)
      .json({ success: false, message: "Client ID is required" });
  }

  const today = moment().endOf("day").toDate();

  const stats = await Project.aggregate([
    { $match: { client: clientId } },

    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: {
          $sum: {
            $cond: [{ $eq: ["$status", "Active"] }, 1, 0],
          },
        },
        completedProjects: {
          $sum: {
            $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
          },
        },
        dueProjects: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lte: ["$dueDate", today] },
                  { $ne: ["$status", "Completed"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalPayment: { $sum: "$finalAmountForClient" },
        paid: { $sum: "$amountPaidByClient" },
        owed: { $sum: "$amountOwedByClient" },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const result = stats[0] || {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    dueProjects: 0,
    totalPayment: 0,
    paid: 0,
    owed: 0,
  };

  return res.status(200).json({ success: true, data: result });
});

export const getClientProjectStatusPie = asyncHandler(async (req, res) => {
  const { clientId } = req.params;

  if (!clientId) {
    return res
      .status(400)
      .json({ success: false, message: "Client ID required" });
  }

  const today = moment().endOf("day").toDate();

  const getStatusCount = async (startDate, endDate) => {
    const stats = await Project.aggregate([
      {
        $match: {
          client: clientId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          due: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ["$dueDate", today] },
                    { $ne: ["$status", "Completed"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ["$dueDate", today] },
                    { $ne: ["$status", "Completed"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const s = stats[0] || {
      total: 0,
      active: 0,
      completed: 0,
      due: 0,
      overdue: 0,
    };

    return [
      { key: "total", value: s.total },
      { key: "active", value: s.active },
      { key: "completed", value: s.completed },
      { key: "due", value: s.due },
      { key: "overdue", value: s.overdue },
    ];
  };

  // --- Date ranges ---
  const lastWeekStart = moment().subtract(6, "days").startOf("day").toDate();
  const lastMonthStart = moment().subtract(29, "days").startOf("day").toDate();
  const lastYearStart = moment()
    .subtract(11, "months")
    .startOf("month")
    .toDate();

  // --- Fetch stats ---
  const week = await getStatusCount(lastWeekStart, today);
  const month = await getStatusCount(lastMonthStart, today);
  const year = await getStatusCount(lastYearStart, today);

  return res.status(200).json({
    success: true,
    data: {
      week,
      month,
      year,
    },
  });
});

export const getClientProjectPayment = asyncHandler(async (req, res) => {
  const { clientId, projectId } = req.params; // projectId optional

  if (!clientId) {
    return res
      .status(400)
      .json({ success: false, message: "Client ID required" });
  }

  const matchFilter = { client: clientId };
  if (projectId) matchFilter._id = projectId;

  const stats = await Project.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalPayment: { $sum: "$finalAmountForClient" },
        paid: { $sum: "$amountPaidByClient" },
        owed: { $sum: "$amountOwedByClient" },
      },
    },
  ]);

  const s = stats[0] || { totalPayment: 0, paid: 0, owed: 0 };

  const keyValueResult = [
    { key: "Total Payment", value: s.totalPayment },
    { key: "Paid", value: s.paid },
    { key: "Owed", value: s.owed },
  ];

  res.status(200).json({ success: true, data: keyValueResult });
});

//for Member

export const getFreelancerStats = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid freelancer ID" });
    }

    // Get start and end of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    // --- Project Payments ---
    const paymentStats = await ProjectMember.aggregate([
      { $match: { freelancer: freelancerId } },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$haveToPay" },
          totalPaid: { $sum: "$amountPaid" },
          totalOwed: { $sum: "$amountOwed" },
        },
      },
    ]);

    const {
      totalEarnings = 0,
      totalPaid = 0,
      totalOwed = 0,
    } = paymentStats[0] || {};

    // --- Task Stats (this month) ---
    const taskFilter = {
      members: new mongoose.Types.ObjectId(freelancerId),
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    };

    const [totalTasks, totalDueTasks, totalOverdueTasks, totalCompletedTasks] =
      await Promise.all([
        // Total tasks created this month
        Task.countDocuments(taskFilter),

        // Due tasks this month (not completed)
        Task.countDocuments({
          ...taskFilter,
          status: { $ne: "Completed" },
          dueDate: { $gte: startOfMonth, $lt: endOfMonth },
        }),

        // Overdue tasks (due date passed, not completed)
        Task.countDocuments({
          members: new mongoose.Types.ObjectId(freelancerId),
          dueDate: { $lt: new Date() },
          status: { $ne: "Completed" },
        }),

        // Completed tasks this month
        Task.countDocuments({
          members: new mongoose.Types.ObjectId(freelancerId),
          status: "Completed",
          completionDate: { $gte: startOfMonth, $lt: endOfMonth },
        }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        totalPaid,
        totalOwed,
        totalTasks,
        totalDueTasks,
        totalOverdueTasks,
        totalCompletedTasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFreelancerTaskSummary = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid freelancer ID" });
    }

    const now = new Date();

    // Define periods
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Helper to get stats for any range
    const getStats = async (startDate) => {
      const [active, completed, overdue] = await Promise.all([
        // Active = Not Completed
        Task.countDocuments({
          members: freelancerId,
          status: { $ne: "Completed" },
          createdAt: { $gte: startDate, $lte: now },
        }),
        // Completed tasks
        Task.countDocuments({
          members: freelancerId,
          status: "Completed",
          completionDate: { $gte: startDate, $lte: now },
        }),
        // Overdue tasks (due date passed and not completed)
        Task.countDocuments({
          members: freelancerId,
          dueDate: { $lt: now },
          status: { $ne: "Completed" },
          createdAt: { $gte: startDate },
        }),
      ]);

      return [
        {
          key: "Active",
          value: active,
        },
        {
          key: "Completed",
          value: completed,
        },
        {
          key: "Overdue",
          value: overdue,
        },
      ];
    };

    const [week, month, year] = await Promise.all([
      getStats(startOfWeek),
      getStats(startOfMonth),
      getStats(startOfYear),
    ]);

    res.status(200).json({
      success: true,
      data: {
        week,
        month,
        year,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFreelancerEarningsStats = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;
    const { projectId } = req.query; // optional ?projectId=...

    if (!mongoose.Types.ObjectId.isValid(freelancerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid freelancer ID" });
    }

    const now = moment();
    const startOfMonth = now.clone().startOf("month").toDate();
    const endOfMonth = now.clone().endOf("month").toDate();

    // 🔍 Build filter
    const filter = {
      freelancer: freelancerId,
    };

    if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
      filter.project = projectId;
    }

    // 🔢 Aggregate stats for this month
    const stats = await ProjectMember.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: "$haveToPay" },
          totalPaid: { $sum: "$amountPaid" },
          totalOwed: { $sum: "$amountOwed" },
        },
      },
    ]);

    const { totalEarnings = 0, totalPaid = 0, totalOwed = 0 } = stats[0] || {};

    return res.status(200).json({
      success: true,
      data: [
        {
          key: "Total Earnings",
          value: totalEarnings,
        },
        {
          key: "Total Paid",
          value: totalPaid,
        },
        {
          key: "Total Owed",
          value: totalOwed,
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

//for reports
export const getTaskReport = asyncHandler(async (req, res) => {
  const now = new Date();

  const stats = await Task.aggregate([
    {
      $facet: {
        totalTasks: [{ $count: "count" }],

        totalAssigned: [
          { $match: { members: { $exists: true, $not: { $size: 0 } } } },
          { $count: "count" },
        ],

        totalActive: [
          {
            $match: {
              status: { $in: ["In Progress", "Not Started"] },
              completionDate: { $in: [null, undefined] },
            },
          },
          { $count: "count" },
        ],

        totalCompleted: [
          { $match: { status: "Completed" } },
          { $count: "count" },
        ],

        totalOverdue: [
          {
            $match: {
              dueDate: { $lt: now },
              status: { $ne: "Completed" },
            },
          },
          { $count: "count" },
        ],

        avgCompletionTime: [
          {
            $match: {
              completionDate: { $ne: null },
              startDate: { $ne: null },
            },
          },
          {
            $project: {
              diffDays: {
                $divide: [
                  { $subtract: ["$completionDate", "$startDate"] },
                  1000 * 60 * 60 * 24, // convert ms → days
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              avgDays: { $avg: "$diffDays" },
            },
          },
        ],
      },
    },
    {
      $project: {
        totalTasks: {
          $ifNull: [{ $arrayElemAt: ["$totalTasks.count", 0] }, 0],
        },
        totalAssigned: {
          $ifNull: [{ $arrayElemAt: ["$totalAssigned.count", 0] }, 0],
        },
        totalActive: {
          $ifNull: [{ $arrayElemAt: ["$totalActive.count", 0] }, 0],
        },
        totalCompleted: {
          $ifNull: [{ $arrayElemAt: ["$totalCompleted.count", 0] }, 0],
        },
        totalOverdue: {
          $ifNull: [{ $arrayElemAt: ["$totalOverdue.count", 0] }, 0],
        },
        averageCompletionTime: {
          $round: [
            {
              $ifNull: [{ $arrayElemAt: ["$avgCompletionTime.avgDays", 0] }, 0],
            },
            1,
          ],
        },
      },
    },
  ]);

  const data = stats[0] || {};

  // ✅ Format into key–value pairs
  const formatted = [
    // { key: "Total Tasks", value: data.totalTasks || 0 },
    { key: "Task Assigned", value: data.totalAssigned || 0 },
    { key: "Active", value: data.totalActive || 0 },
    { key: "Completed Tasks", value: data.totalCompleted || 0 },
    { key: "Overdue", value: data.totalOverdue || 0 },
    {
      key: "Avg. Completion Time",
      value: data.averageCompletionTime || 0,
    },
  ];

  res.status(200).json({
    success: true,
    data: formatted,
  });
});

export const getRevenueReport = asyncHandler(async (req, res, next) => {
  const data = await getTotalRevenue();
  res.status(200).json({ success: true, data });
});

export const getProjectsReport = asyncHandler(async (req, res) => {
  const today = moment().endOf("day").toDate();

  const stats = await Project.aggregate([
    {
      $match: {
        archive: false, // only non-archived projects
      },
    },
    {
      $group: {
        _id: null,
        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", today] },
                  { $ne: ["$status", "Completed"] },
                  { $ne: ["$status", "Cancelled"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  const result = stats[0] || {
    active: 0,
    completed: 0,
    overdue: 0,
  };

  // Convert to key-value format (for charts or cards)
  const formatted = [
    { key: "Active", value: result.active },
    { key: "Completed", value: result.completed },
    { key: "Overdue", value: result.overdue },
  ];

  res.status(200).json({
    success: true,
    data: formatted,
  });
});
export const getTaskCountByStage = asyncHandler(async (req, res) => {
  // Aggregate task counts grouped by stage
  const stageStats = await Task.aggregate([
    {
      $group: {
        _id: "$stage",
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "stages",
        localField: "_id",
        foreignField: "_id",
        as: "stageInfo",
      },
    },
    {
      $unwind: {
        path: "$stageInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        stageId: "$_id",
        title: "$stageInfo.title",
        color: "$stageInfo.color",
        order: "$stageInfo.order",
        count: 1,
      },
    },
    { $sort: { order: 1 } }, // optional sorting by stage order
  ]);

  // Include stages that have 0 tasks
  const allStages = await Stage.find({}, "title color order").lean();
  const stageMap = new Map(stageStats.map((s) => [s.stageId?.toString(), s]));

  const fullList = allStages.map((stage) => ({
    stageId: stage._id,
    title: stage.title,
    color: stage.color,
    order: stage.order,
    count: stageMap.get(stage._id.toString())?.count || 0,
  }));

  res.status(200).json({
    success: true,
    data: fullList,
  });
});

// const getProjectActivity = asyncHandler(async (clientId = null) => {
//   const twelveMonthsAgo = moment().subtract(12, "months").startOf("month").toDate();

// Build filter
// Optimization: We only need to fetch projects relevant to the full 12-month period,
// but we should ensure we get all data needed for historical counting.
// Filtering by createdAt is fine, but startDate might be better for true historical view.
// const filter = {
//   $or: [
//     { createdAt: { $gte: twelveMonthsAgo } }, // Projects created recently
//     { startDate: { $lte: moment().endOf("month").toDate() } }, // Or projects active anytime in the past
//   ],
// };
// if (clientId) {
//   filter.client = clientId;
//   // Revert filter to simplify: just fetch all relevant projects
//   delete filter.$or;
//   filter.client = clientId;
//   // Fetching all projects that existed during the analysis period:
//   filter.startDate = { $lte: moment().toDate() };
// } else {
//   filter.startDate = { $lte: moment().toDate() };
// }

//   // Build filter
//   const filter = { createdAt: { $gte: twelveMonthsAgo } };
//   if (clientId) filter.client = clientId; // optional client filter

//   // Fetch projects (all or specific client)
//   const projects = await Project.find(filter);

//   // Helper: count active, completed, due, overdue for a given day/month
//   const countByDate = (projects, date, unit = "day") => {
//     let startRange, endRange;

//     if (unit === "day") {
//       startRange = date.clone().startOf("day");
//       endRange = date.clone().endOf("day");
//     } else if (unit === "month") {
//       startRange = date.clone().startOf("month");
//       endRange = date.clone().endOf("month");
//     } else {
//       throw new Error("Unsupported unit for countByDate");
//     }

//     let active = 0,
//       completed = 0,
//       due = 0,
//       overdue = 0;

//     projects.forEach((p) => {
//       const start = moment(p.startDate);
//       const dueDate = moment(p.dueDate);
//       const completion = p.completionDate ? moment(p.completionDate) : null;

//       // Active: started before end of range AND not completed before start of range
//       if (start.isSameOrBefore(endRange) && (!completion || completion.isAfter(startRange))) active++;

//       // Completed: completed within range
//       if (completion && completion.isBetween(startRange, endRange, null, "[]")) completed++;

//       // Due: due date within range
//       if (dueDate.isBetween(startRange, endRange, null, "[]")) due++;

//       // Overdue: due date before end of range AND not completed before due date
//       if (dueDate.isBefore(endRange) && (!completion || completion.isAfter(dueDate))) overdue++;
//     });

//     return { active, completed, due, overdue };
//   };

//   // --- Last 7 days ---
//   const week = [];
//   for (let i = 6; i >= 0; i--) {
//     const date = moment().subtract(i, "days");
//     week.push({
//       Key: date.format("DD MMM"),
//       ...countByDate(projects, date, "day"),
//     });
//   }

//   // --- Last 30 days ---
//   const month = [];
//   for (let i = 29; i >= 0; i--) {
//     const date = moment().subtract(i, "days");
//     month.push({
//       Key: date.format("DD MMM"),
//       ...countByDate(projects, date, "day"),
//     });
//   }

//   // --- Last 12 months ---
//   const year = [];
//   for (let i = 11; i >= 0; i--) {
//     const date = moment().subtract(i, "months");
//     year.push({
//       Key: date.format("MMM YYYY"),
//       ...countByDate(projects, date, "month"),
//     });
//   }

//   return { week, month, year };
// });

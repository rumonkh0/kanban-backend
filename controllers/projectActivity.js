import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import ProjectActivity from "../models/ProjectActivity.js";

// @desc      Log a new project activity (e.g., manually added)
// @route     POST /api/v1/projectactivities
// @access    Private/Admin (Or Private/User depending on permission)
export const createProjectActivity = asyncHandler(async (req, res, next) => {
  const { title, projectId, date } = req.body;

  if (!title || !projectId) {
    return next(new ErrorResponse("Title and Project ID are required.", 400));
  }

  // Use the reusable function to handle the database insertion
  const savedActivity = await addProjectActivity(title, projectId, date);

  res.status(201).json({
    success: true,
    data: savedActivity,
  });
});

// @desc      Get all project activities
// @route     GET /api/v1/projectactivities
// @access    Private
export const getAllActivities = asyncHandler(async (req, res, next) => {
  const filters = {};
  if (req.query.project) filters.project = req.query.project;
  if (req.params.projectId) filters.project = req.params.projectId;
  const activities = await ProjectActivity.find(filters)
    // .populate("project", "name description")
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

// @desc      Get activities by Project ID
// @route     GET /api/v1/projectactivities/project/:projectId
// @access    Private
export const getActivitiesByProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  const activities = await ProjectActivity.find({ project: projectId })
    .populate("project", "name")
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

// @desc      Update a project activity
// @route     PUT /api/v1/projectactivities/:id
// @access    Private/Admin
export const updateActivity = asyncHandler(async (req, res, next) => {
  const updates = req.body;

  const updatedActivity = await ProjectActivity.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!updatedActivity) {
    return next(
      new ErrorResponse(`Activity not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: updatedActivity,
  });
});

// @desc      Delete a project activity
// @route     DELETE /api/v1/projectactivities/:id
// @access    Private/Admin
export const deleteActivity = asyncHandler(async (req, res, next) => {
  const activity = await ProjectActivity.findById(req.params.id);

  if (!activity) {
    return next(
      new ErrorResponse(`Activity not found with id of ${req.params.id}`, 404)
    );
  }

  await activity.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

export const addProjectActivity = asyncHandler(
  async (title, projectId, date) => {
    try {
      const newActivity = new ProjectActivity({
        title, // ES6 Shorthand property name
        project: projectId,
        date,
      });

      const savedActivity = await newActivity.save();

      // Return the created activity
      return savedActivity;
    } catch (error) {
      console.error("Error logging project activity:", error);
      // Re-throw the error so the calling controller can handle the HTTP response
      throw new Error("Failed to log project activity.");
    }
  }
);

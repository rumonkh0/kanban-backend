import asyncHandler from "../middleware/async.js";
import Tracker from "../models/Tracker.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import Freelancer from "../models/Freelancer.js";

// @desc      Create a tracker
// @route     POST /api/v1/trackers
// @access    Private/Admin
export const createTracker = asyncHandler(async (req, res, next) => {
  const { project, client, freelancer, ...trackerData } = req.body;

  const existingProject = await Project.findById(project);
  if (!existingProject) {
    return res.status(404).json({
      success: false,
      error: "Project not found.",
    });
  }

  if (client) {
    const existingClient = await Client.findById(client);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        error: "Client not found.",
      });
    }
  }

  if (freelancer) {
    const existingFreelancer = await Freelancer.findById(freelancer);
    if (!existingFreelancer) {
      return res.status(404).json({
        success: false,
        error: "Freelancer not found.",
      });
    }
  }

  const tracker = await Tracker.create({
    project,
    client,
    freelancer,
    ...trackerData,
  });

  res.status(201).json({
    success: true,
    data: tracker,
  });
});

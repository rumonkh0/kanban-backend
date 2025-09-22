import asyncHandler from "../middleware/async.js";
import Service from "../models/Service.js";
import Freelancer from "../models/Freelancer.js";

// @desc      Create a service
// @route     POST /api/v1/services
// @access    Private/Admin
export const createService = asyncHandler(async (req, res, next) => {
  const { freelancer, ...serviceData } = req.body;

  if (freelancer) {
    const existingFreelancer = await Freelancer.findById(freelancer);
    if (!existingFreelancer) {
      return res.status(404).json({
        success: false,
        error: "Freelancer not found.",
      });
    }
  }

  const service = await Service.create({
    freelancer,
    ...serviceData,
  });

  res.status(201).json({
    success: true,
    data: service,
  });
});
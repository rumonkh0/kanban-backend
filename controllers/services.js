import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Service from "../models/Service.js";
import Freelancer from "../models/Freelancer.js";

// @desc      Create a new service
// @route     POST /api/v1/services
// @access    Private/Admin
export const createService = asyncHandler(async (req, res, next) => {
  const { freelancers, ...serviceData } = req.body;

  // Validate freelancer IDs if they are provided
  if (freelancers && freelancers.length > 0) {
    for (const id of freelancers) {
      const existingFreelancer = await Freelancer.findById(id);
      if (!existingFreelancer) {
        return next(
          new ErrorResponse(`Freelancer not found with id of ${id}`, 404)
        );
      }
    }
  }

  const service = await Service.create({
    ...serviceData,
    freelancers,
  });

  res.status(201).json({
    success: true,
    data: service,
  });
});

// @desc      Get all services
// @route     GET /api/v1/services
// @access    Private
export const getServices = asyncHandler(async (req, res, next) => {
  const services = await Service.find().populate({
    path: "freelancers",
    select: "name profilePicture",
    populate: {
      path: "profilePicture",
      select: "filePath",
    },
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services,
  });
});

// @desc      Get single service
// @route     GET /api/v1/services/:id
// @access    Private
export const getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id).populate({
    path: "freelancers",
    select: "name profilePicture",
    populate: {
      path: "profilePicture",
      select: "filePath",
    },
  });

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: service,
  });
});

// @desc      Update a service
// @route     PUT /api/v1/services/:id
// @access    Private/Admin
export const updateService = asyncHandler(async (req, res, next) => {
  const { freelancers, ...updateData } = req.body;
  let service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  // Validate freelancer IDs if they are provided in the update
  if (freelancers && freelancers.length > 0) {
    for (const id of freelancers) {
      const existingFreelancer = await Freelancer.findById(id);
      if (!existingFreelancer) {
        return next(
          new ErrorResponse(`Freelancer not found with id of ${id}`, 404)
        );
      }
    }
  }

  service = await Service.findByIdAndUpdate(
    req.params.id,
    { ...updateData, freelancers },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: service,
  });
});

// @desc      Delete a service
// @route     DELETE /api/v1/services/:id
// @access    Private/Admin
export const deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  await service.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

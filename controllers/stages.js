import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Stage from "../models/Stage.js";

// @desc      Create a stage with an auto-incrementing order
// @route     POST /api/v1/stages
// @access    Private/Admin
export const createStage = asyncHandler(async (req, res, next) => {
  const { title, color } = req.body;

  // Find the highest existing order
  const lastStage = await Stage.findOne({}).sort({ order: -1 }).select("order");
  
  // Set the new stage's order
  const newOrder = lastStage ? lastStage.order + 1 : 1;

  const stage = await Stage.create({
    title,
    color,
    order: newOrder,
  });

  res.status(201).json({
    success: true,
    data: stage,
  });
});

// @desc      Get all stages
// @route     GET /api/v1/stages
// @access    Private
export const getStages = asyncHandler(async (req, res, next) => {
  const stages = await Stage.find().sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: stages.length,
    data: stages,
  });
});

// @desc      Get a single stage
// @route     GET /api/v1/stages/:id
// @access    Private
export const getStage = asyncHandler(async (req, res, next) => {
  const stage = await Stage.findById(req.params.id);

  if (!stage) {
    return next(new ErrorResponse(`Stage not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: stage,
  });
});

// @desc      Update a stage
// @route     PUT /api/v1/stages/:id
// @access    Private/Admin
export const updateStage = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  let stage = await Stage.findById(id);

  if (!stage) {
    return next(new ErrorResponse(`Stage not found with id of ${id}`, 404));
  }

  stage = await Stage.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: stage,
  });
});

// @desc      Delete a stage
// @route     DELETE /api/v1/stages/:id
// @access    Private/Admin
export const deleteStage = asyncHandler(async (req, res, next) => {
  const stage = await Stage.findById(req.params.id);

  if (!stage) {
    return next(new ErrorResponse(`Stage not found with id of ${req.params.id}`, 404));
  }

  await stage.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});
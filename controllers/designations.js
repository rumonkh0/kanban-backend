import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Designation from "../models/Designation.js";

// @desc      Get all designations
// @route     GET /api/v1/designations
// @access    Private/Admin
export const getDesignations = asyncHandler(async (req, res, next) => {
  const designations = await Designation.find();

  res.status(200).json({
    success: true,
    count: designations.length,
    data: designations,
  });
});

// @desc      Get a single designation
// @route     GET /api/v1/designations/:id
// @access    Private/Admin
export const getDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findById(req.params.id);

  if (!designation) {
    return next(
      new ErrorResponse(
        `Designation not found with id of ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: designation,
  });
});

// @desc      Update a designation
// @route     PUT /api/v1/designations/:id
// @access    Private/Admin
export const updateDesignation = asyncHandler(async (req, res, next) => {
  const { title } = req.body;

  let designation = await Designation.findById(req.params.id);

  if (!designation) {
    return next(
      new ErrorResponse(
        `Designation not found with id of ${req.params.id}`,
        404
      )
    );
  }

  // Update the document
  designation = await Designation.findByIdAndUpdate(
    req.params.id,
    { title },
    {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators for uniqueness, etc.
    }
  );

  res.status(200).json({
    success: true,
    data: designation,
  });
});

// @desc      Create a designation
// @route     POST /api/v1/designations
// @access    Private/Admin
export const createDesignation = asyncHandler(async (req, res, next) => {
  const { title } = req.body;

  const designation = await Designation.create({
    title,
  });

  res.status(201).json({
    success: true,
    data: designation,
  });
});

// @desc      Delete a designation
// @route     DELETE /api/v1/designations/:id
// @access    Private/Admin
export const deleteDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findById(req.params.id);

  if (!designation) {
    return next(
      new ErrorResponse(
        `Designation not found with id of ${req.params.id}`,
        404
      )
    );
  }

  await designation.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

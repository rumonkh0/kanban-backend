import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Appreciation from "../models/Appreciation.js";
import User from "../models/User.js";

// @desc      Create an appreciation
// @route     POST /api/v1/appreciations
// @access    Private/Admin
export const createAppreciation = asyncHandler(async (req, res, next) => {
  const { awardName, givingBy, givingTo } = req.body;

  // Validate that both users exist
  const giver = await User.findById(givingBy);
  if (!giver) {
    return next(
      new ErrorResponse("User who gave the appreciation not found.", 404)
    );
  }
  const receiver = await User.findById(givingTo);
  if (!receiver) {
    return next(
      new ErrorResponse("User who received the appreciation not found.", 404)
    );
  }

  const appreciation = await Appreciation.create({
    awardName,
    givingBy,
    givingTo,
  });

  res.status(201).json({
    success: true,
    data: appreciation,
  });
});

// @desc      Get all appreciations
// @route     GET /api/v1/appreciations
// @access    Private/Admin
export const getAppreciations = asyncHandler(async (req, res, next) => {
  const appreciations = await Appreciation.find()
    .populate({
      path: "givingBy",
      select: "email",
    })
    .populate({
      path: "givingTo",
      select: "email",
    });

  res.status(200).json({
    success: true,
    count: appreciations.length,
    data: appreciations,
  });
});

// @desc      Get a single appreciation
// @route     GET /api/v1/appreciations/:id
// @access    Private/Admin
export const getAppreciation = asyncHandler(async (req, res, next) => {
  const appreciation = await Appreciation.findById(req.params.id)
    .populate({
      path: "givingBy",
      select: "email",
    })
    .populate({
      path: "givingTo",
      select: "email",
    });

  if (!appreciation) {
    return next(
      new ErrorResponse(
        `Appreciation not found with id of ${req.params.id}`,
        404
      )
    );
  }

  res.status(200).json({
    success: true,
    data: appreciation,
  });
});

// @desc      Update an appreciation
// @route     PUT /api/v1/appreciations/:id
// @access    Private/Admin
export const updateAppreciation = asyncHandler(async (req, res, next) => {
  const { awardName, givingBy, givingTo } = req.body;

  let appreciation = await Appreciation.findById(req.params.id);

  if (!appreciation) {
    return next(
      new ErrorResponse(
        `Appreciation not found with id of ${req.params.id}`,
        404
      )
    );
  }
  if (givingBy) {
    const giver = await User.findById(givingBy);
    if (!giver) {
      return next(
        new ErrorResponse("User who gave the appreciation not found.", 404)
      );
    }
  }
  if (givingTo) {
    const receiver = await User.findById(givingTo);
    if (!receiver) {
      return next(
        new ErrorResponse("User who received the appreciation not found.", 404)
      );
    }
  }

  // Prevent modification of giver and receiver
  appreciation = await Appreciation.findByIdAndUpdate(
    req.params.id,
    { awardName, givingBy, givingTo },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: appreciation,
  });
});

// @desc      Delete an appreciation
// @route     DELETE /api/v1/appreciations/:id
// @access    Private/Admin
export const deleteAppreciation = asyncHandler(async (req, res, next) => {
  const appreciation = await Appreciation.findById(req.params.id);

  if (!appreciation) {
    return next(
      new ErrorResponse(
        `Appreciation not found with id of ${req.params.id}`,
        404
      )
    );
  }

  await appreciation.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

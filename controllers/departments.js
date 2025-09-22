import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Department from "../models/Department.js";

// @desc      Create a department
// @route     POST /api/v1/departments
// @access    Private/Admin
export const createDepartment = asyncHandler(async (req, res, next) => {
  const { title } = req.body;

  const department = await Department.create({
    title,
  });

  res.status(201).json({
    success: true,
    data: department,
  });
});

// @desc      Get all departments
// @route     GET /api/v1/departments
// @access    Private/Admin
export const getDepartments = asyncHandler(async (req, res, next) => {
  const departments = await Department.find();

  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments,
  });
});

// @desc      Get a single department
// @route     GET /api/v1/departments/:id
// @access    Private/Admin
export const getDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(
      new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc      Update a department
// @route     PUT /api/v1/departments/:id
// @access    Private/Admin
export const updateDepartment = asyncHandler(async (req, res, next) => {
  const { title } = req.body;

  let department = await Department.findById(req.params.id);

  if (!department) {
    return next(
      new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
    );
  }

  department = await Department.findByIdAndUpdate(
    req.params.id,
    { title },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: department,
  });
});

// @desc      Delete a department
// @route     DELETE /api/v1/departments/:id
// @access    Private/Admin
export const deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return next(
      new ErrorResponse(`Department not found with id of ${req.params.id}`, 404)
    );
  }

  await department.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

import asyncHandler from "../middleware/async.js";
import Payment from "../models/Payment.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import ErrorResponse from "../utils/errorResponse.js";

// @desc      Create a payment record
// @route     POST /api/v1/payments
// @access    Private/Admin
export const createPayment = asyncHandler(async (req, res, next) => {
  const { project, client } = req.body;
  let relatedFile = null;

  const existingProject = await Project.findById(project);
  if (!existingProject)
    return next(new ErrorResponse("Project not found.", 404));

  if (client) {
    const existingClient = await Client.findById(client);
    if (!existingClient)
      return next(new ErrorResponse("Client not found.", 404));
  }

  if (req.file) {
    relatedFile = req.file.path;
  }

  const payment = await Payment.create({
    ...req.body,
    relatedFile,
  });

  res.status(201).json({
    success: true,
    data: payment,
  });
});

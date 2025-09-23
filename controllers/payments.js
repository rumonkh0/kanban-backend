import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Payment from "../models/Payment.js";
import File from "../models/File.js";
import fs from "fs";
import Client from "../models/Client.js";
import Project from "../models/Project.js";

// @desc      Create a payment
// @route     POST /api/v1/payments
// @access    Private/Admin
export const createPayment = asyncHandler(async (req, res, next) => {
  const { toBePaid, amountPaid, project, client, ...paymentData } = req.body;
  const amountOwed = toBePaid - amountPaid;

  const existingProject = await Project.findById(project);
  if (!existingProject)
    return next(new ErrorResponse("Project not found.", 404));

  if (client) {
    const existingClient = await Client.findById(client);
    if (!existingClient)
      return next(new ErrorResponse("Client not found.", 404));
  }

  // Handle file upload
  let relatedFile = null;
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      const newFile = await File.create({
        // uploadedBy: req.user._id,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      relatedFile = newFile._id;
    } catch (err) {
      fs.unlink(file.path, () => {});
      return next(
        new ErrorResponse(`Failed to create file record: ${err.message}`, 500)
      );
    }
  }

  const payment = await Payment.create({
    ...paymentData,
    project,
    client,
    toBePaid,
    amountPaid,
    amountOwed,
    relatedFile,
    paymentStatus:
      amountOwed <= 0 ? "Paid" : amountPaid > 0 ? "Partial" : "Owed",
  });

  res.status(201).json({
    success: true,
    data: payment,
  });
});

// @desc      Get all payments, or filter by project/client
// @route     GET /api/v1/payments
// @route     GET /api/v1/projects/:projectId/payments
// @route     GET /api/v1/clients/:clientId/payments
// @access    Private/Admin
export const getPayments = asyncHandler(async (req, res, next) => {
  const filter = {};

  if (req.params.projectId) {
    filter.project = req.params.projectId;
  }
  if (req.params.clientId) {
    filter.client = req.params.clientId;
  }

  const payments = await Payment.find(filter)
    .populate("project", "name")
    .populate("client", "name")
    .populate("relatedFile", "fileName filePath originalName");

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments,
  });
});

// @desc      Get single payment
// @route     GET /api/v1/payments/:id
// @access    Private/Admin
export const getPayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id)
    .populate("project", "name")
    .populate("client", "name")
    .populate("relatedFile", "fileName filePath originalName");

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: payment,
  });
});

// @desc      Update a payment
// @route     PUT /api/v1/payments/:id
// @access    Private/Admin
export const updatePayment = asyncHandler(async (req, res, next) => {
  let payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Handle file update
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      // Delete old file
      if (payment.relatedFile) {
        const oldFile = await File.findById(payment.relatedFile);
        if (oldFile && fs.existsSync(oldFile.filePath)) {
          fs.unlink(oldFile.filePath, (err) => {
            if (err) console.error("Error deleting old file:", err);
          });
          await File.findByIdAndDelete(oldFile._id);
        }
      }
      // Create new file
      const newFile = await File.create({
        // uploadedBy: req.user._id,
        filePath: file.path,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      req.body.relatedFile = newFile._id;
    } catch (err) {
      fs.unlink(file.path, () => {});
      return next(
        new ErrorResponse(`Failed to update file record: ${err.message}`, 500)
      );
    }
  }

  // Calculate updated amount owed if relevant fields are present
  if (req.body.toBePaid !== undefined || req.body.amountPaid !== undefined) {
    const newToBePaid = req.body.toBePaid || payment.toBePaid;
    const newAmountPaid = req.body.amountPaid || payment.amountPaid;
    req.body.amountOwed = newToBePaid - newAmountPaid;

    if (req.body.amountOwed <= 0) {
      req.body.paymentStatus = "Paid";
    } else if (newAmountPaid > 0) {
      req.body.paymentStatus = "Partial";
    } else {
      req.body.paymentStatus = "Owed";
    }
  }

  payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: payment,
  });
});

// @desc      Delete a payment
// @route     DELETE /api/v1/payments/:id
// @access    Private/Admin
export const deletePayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete associated file
  if (payment.relatedFile) {
    const file = await File.findById(payment.relatedFile);
    if (file && fs.existsSync(file.filePath)) {
      fs.unlink(file.filePath, (err) => {
        if (err) console.error("Error deleting payment file:", err);
      });
      await File.findByIdAndDelete(file._id);
    }
  }

  await payment.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

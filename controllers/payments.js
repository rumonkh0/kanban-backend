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
  const { amountPaid, project, paymentStatus, ...paymentData } = req.body;

  // Find project and client (if provided)
  const existingProject = await Project.findById(project);
  if (!existingProject) {
    return next(new ErrorResponse("Project not found.", 404));
  }

  let toBePaid = existingProject.amountOwedByClient;

  if (!project || toBePaid === undefined) {
    return next(
      new ErrorResponse("Project and toBePaid amount are required.", 400)
    );
  }

  // Calculate amounts and status
  const amountOwed = toBePaid - amountPaid;

  // Create payment record
  let payment = await Payment.create({
    ...paymentData,
    project,
    client: existingProject.client,
    toBePaid,
    amountPaid,
    amountOwed,
    paymentStatus,
    paymentDate: amountPaid > 0 ? Date.now() : undefined,
  });

  // Handle file upload
  let relatedFile = null;
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      const newFile = await File.create({
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
        linkedTo: payment._id,
        linkedModel: "Payment",
      });
      relatedFile = newFile._id;

      // Update the payment record with the new file reference
      payment.relatedFile = relatedFile;
      await payment.save();
    } catch (err) {
      fs.unlink(file.path, () => {});
      return next(
        new ErrorResponse(`Failed to create file record: ${err.message}`, 500)
      );
    }
  }

  // Update amountPaid on the Project
  if (paymentStatus === "Paid")
    if (amountPaid > 0) {
      const projectDoc = await Project.findById(project);
      if (projectDoc) {
        projectDoc.amountPaid = (projectDoc.amountPaid || 0) + amountPaid;
        await projectDoc.save();
      }
    }

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
  res
    .status(200)
    .json({ success: true, count: payments.length, data: payments });
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
  res.status(200).json({ success: true, data: payment });
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

  // A 'Paid' record cannot be updated
  if (payment.paymentStatus === "Paid") {
    return next(
      new ErrorResponse(
        "Cannot update a payment record that is already marked as 'Paid'.",
        400
      )
    );
  }

  const { toBePaid, amountPaid, ...updateData } = req.body;

  // Calculate new amounts and status if relevant fields are present
  let newToBePaid = toBePaid !== undefined ? toBePaid : payment.toBePaid;
  let newAmountPaid =
    amountPaid !== undefined ? amountPaid : payment.amountPaid;
  let newAmountOwed = newToBePaid - newAmountPaid;

  let newStatus;
  if (newAmountOwed <= 0) {
    newStatus = "Paid";
  } else if (newAmountPaid > 0) {
    newStatus = "Partial";
  } else {
    newStatus = "Owed";
  }

  // Handle file update
  if (req.files && req.files.relatedFile && req.files.relatedFile.length > 0) {
    const file = req.files.relatedFile[0];
    try {
      // Delete old file if it exists
      if (payment.relatedFile) {
        const oldFile = await File.findById(payment.relatedFile);
        if (oldFile && fs.existsSync(oldFile.filePath)) {
          fs.unlinkSync(oldFile.filePath);
          await File.findByIdAndDelete(oldFile._id);
        }
      }
      // Create new file, linking it to the current payment
      const newFile = await File.create({
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
        linkedTo: payment._id,
        linkedModel: "Payment",
      });
      updateData.relatedFile = newFile._id;
    } catch (err) {
      fs.unlinkSync(file.path);
      return next(
        new ErrorResponse(`Failed to update file record: ${err.message}`, 500)
      );
    }
  }

  // Update amountPaid on the Project
  const oldAmountPaid = payment.amountPaid;
  if (newAmountPaid > oldAmountPaid) {
    const projectDoc = await Project.findById(payment.project);
    if (projectDoc) {
      projectDoc.amountPaid =
        (projectDoc.amountPaid || 0) + (newAmountPaid - oldAmountPaid);
      await projectDoc.save();
    }
  }

  // Find and update the payment document
  payment = await Payment.findByIdAndUpdate(
    req.params.id,
    {
      ...updateData,
      toBePaid: newToBePaid,
      amountPaid: newAmountPaid,
      amountOwed: newAmountOwed,
      paymentStatus: newStatus,
    },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: payment,
  });
});

// @desc      Delete a payment and associated file
// @route     DELETE /api/v1/payments/:id
// @access    Private/Admin
export const deletePayment = asyncHandler(async (req, res, next) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    return next(
      new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404)
    );
  }
  // Delete associated file from disk and database
  if (payment.relatedFile) {
    const file = await File.findById(payment.relatedFile);
    if (file && fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
      await File.findByIdAndDelete(file._id);
    }
  }
  // Update Project amountPaid if payment was recorded
  if (payment.amountPaid > 0) {
    const project = await Project.findById(payment.project);
    if (project) {
      project.amountPaid -= payment.amountPaid;
      await project.save();
    }
  }
  await payment.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

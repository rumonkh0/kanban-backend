import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "../middleware/async.js";
import fs from "fs";
import Client from "../models/Client.js";
import User from "../models/User.js";
import File from "../models/File.js";
import path from "path";
import Project from "../models/Project.js";

// @desc      Get all clients
// @route     GET /api/v1/clients
// @access    Private/Admin
export const getClients = asyncHandler(async (req, res, next) => {
  console.log(req.query);
  const clients = await Client.find(req.query)
    .populate({ path: "user", select: "email lastLogin" })
    .populate({ path: "profilePicture", select: "filePath" });

  res.status(200).json({
    success: true,
    count: clients.length,
    data: clients,
  });
});

// @desc      Get single client
// @route     GET /api/v1/clients/:id
// @access    Private/Admin
export const getClient = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id)
    .populate({
      path: "user",
      select: "email role lastLogin",
    })
    .populate({
      path: "profilePicture",
      select: "filePath",
    })
    .populate({
      path: "companyLogo",
      select: "filePath",
    });

  if (!client) {
    return next(
      new ErrorResponse(`Client not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: client,
  });
});

export const getClientDetails = asyncHandler(async (req, res, next) => {
  const clientId = req.params.id;

  // 1. Find the Client Document
  const client = await Client.findById(clientId)
    .populate({
      path: "user",
      select: "email role lastLogin",
    })
    .populate({
      path: "profilePicture",
      select: "filePath",
    })
    .populate({
      path: "companyLogo",
      select: "filePath",
    });

  if (!client) {
    return next(
      new ErrorResponse(`Client not found with id of ${clientId}`, 404)
    );
  }

  // 2. Aggregate Project Data for the Client
  const projectStats = await Project.aggregate([
    {
      // Match projects belonging to this specific client
      $match: {
        client: client._id, // Use the client's ObjectId
      },
    },
    {
      $group: {
        _id: null,
        // Financial Metrics
        totalProjects: { $sum: 1 }, // Count total projects
        totalEarnings: { $sum: "$finalAmountEarned" }, // Sum of total profit (Net)
        totalDue: { $sum: "$amountOwedByClient" }, // Sum of money still owed by the client
        totalPayment: { $sum: "$finalAmountForClient" },
        totalPaid: { $sum: "$amountPaidByClient" },

        // Status Counts for the Graph
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
        },
        active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        onHold: { $sum: { $cond: [{ $eq: ["$status", "On Hold"] }, 1, 0] } },
      },
    },
    // Final projection to rename fields and remove _id
    {
      $project: {
        _id: 0,
        totalProjects: 1,
        totalEarnings: { $round: ["$totalEarnings", 2] },
        totalDue: { $round: ["$totalDue", 2] },
        statusCounts: [
          // Format status counts for the graph
          { key: "Completed", value: "$completed" },
          { key: "Active", value: "$active" },
          { key: "On Hold", value: "$onHold" },
        ],
        paymentStatus: [
          { key: "Total Paid", value: "$totalPaid" },
          { key: "Total Due", value: "$totalDue" },
        ],
      },
    },
  ]);

  console.log(projectStats);

  // Extract the aggregation result (default to zero if no projects found)
  const stats = projectStats[0] || {
    totalEarnings: 0,
    totalDue: 0,
    totalProjects: 0,
    statusCounts: [
      { key: "Completed", value: 0 },
      { key: "Active", value: 0 },
      { key: "On Hold", value: 0 },
    ],
    paymentStatus: [
      { key: "Total Paid", value: 0 },
      { key: "Total Due", value: 0 },
    ],
  };

  const paymentStats = projectStats[1] || {
    totalEarnings: 0,
    totalDue: 0,
    paymentStatus: [
      { key: "Total Paid", value: 0 },
      { key: "Total Due", value: 0 },
    ],
  };

  // 3. Combine Data and Respond
  res.status(200).json({
    success: true,
    data: {
      ...client.toObject(), // Convert Mongoose document to plain object
      ...stats, // Merge the aggregated statistics
    },
  });
});

// @desc      Create client
// @route     POST /api/v1/clients
// @access    Private/Admin
export const createClient = asyncHandler(async (req, res, next) => {
  const { email, password, ...profileData } = req.body;
  let profilePicture, companyLogo;

  if (req.files && req.files.profilePicture) {
    const file = req.files.profilePicture[0];

    const newImage = await File.create({
      // uploadedBy: req.user._id,
      filePath: path.relative("public", file.path),
      mimeType: file.mimetype,
      fileSize: file.size,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: file.filename.split(".").pop(),
    });
    profilePicture = newImage._id;
  }

  if (req.files && req.files.companyLogo) {
    const file = req.files.companyLogo[0];
    const newImage = await File.create({
      // uploadedBy: req.user._id,
      filePath: path.relative("public", file.path),
      mimeType: file.mimetype,
      fileSize: file.size,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: file.filename.split(".").pop(),
    });

    companyLogo = newImage._id;
  }

  const user = await User.create({
    email,
    password,
    role: "Client",
  });
  let client;
  try {
    client = await Client.create({
      user: user._id,
      ...profileData,
      profilePicture,
      companyLogo,
    });
    user.profile = client._id;
    await user.save();
  } catch (error) {
    if (user) {
      await user.deleteOne();
    }
    if (profilePicture) {
      const deleteFile = await File.findById(profilePicture);
      const fullPath = path.join("public", deleteFile.filePath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error("Error deleting profile picture:", err);
      });
      if (deleteFile) await deleteFile.deleteOne();
    }
    if (companyLogo) {
      const deleteFile = await File.findById(companyLogo);
      const fullPath = path.join("public", deleteFile.filePath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error("Error deleting company logo:", err);
      });
      if (deleteFile) await deleteFile.deleteOne();
    }
    return next(error);
  }

  // await new Promise((res) => setTimeout(res, 4000)); // sleeps 1 second

  res.status(201).json({
    success: true,
    data: client,
  });
});

// @desc      Update client
// @route     PUT /api/v1/clients/:id
// @access    Private/Admin
export const updateClient = asyncHandler(async (req, res, next) => {
  let id = req.params.id;
  if (req.user.role === "Client") id = req.user.profile._id;
  let client = await Client.findById(id);
  console.log(req.body);

  if (!client) {
    return next(
      new ErrorResponse(`Client not found with id of ${req.params.id}`, 404)
    );
  }

  const { email, password, ...profileData } = req.body;
  const updateData = { ...profileData };

  if (req.files) {
    if (req.files.profilePicture) {
      const deleteFile = await File.findById(client.profilePicture);
      if (deleteFile) {
        const fullPath = path.join("public", deleteFile.filePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error("Error deleting old profile picture:", err);
        });
        if (deleteFile) await deleteFile.deleteOne();
      }

      const file = req.files.profilePicture[0];

      try {
        const newImage = await File.create({
          // uploadedBy: req.user._id,
          filePath: path.relative("public", file.path),
          mimeType: file.mimetype,
          fileSize: file.size,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.filename.split(".").pop(),
        });
        updateData.profilePicture = newImage._id;
      } catch (err) {
        const fullPath = path.join("public", file.path);
        fs.unlink(fullPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting newly uploaded file:", unlinkErr);
        });
        return next(
          new ErrorResponse(
            `Failed to update profile picture: ${err.message}`,
            500
          )
        );
      }
    }

    if (req.files.companyLogo) {
      if (client.companyLogo) {
        const deleteFile = await File.findById(client.companyLogo);
        const fullPath = path.join("public", deleteFile.filePath);
        fs.unlink(fullPath, (err) => {
          if (err) console.error("Error deleting old company logo:", err);
        });

        if (deleteFile) await deleteFile.deleteOne();
      }

      const file = req.files.companyLogo[0];
      try {
        const newImage = await File.create({
          // uploadedBy: req.user._id,
          filePath: path.relative("public", file.path),
          mimeType: file.mimetype,
          fileSize: file.size,
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.filename.split(".").pop(),
        });
        updateData.companyLogo = newImage._id;
      } catch (err) {
        const fullPath = path.join("public", file.path);
        fs.unlink(fullPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error deleting newly uploaded file:", unlinkErr);
        });
        return next(
          new ErrorResponse(
            `Failed to update profile picture: ${err.message}`,
            500
          )
        );
      }
    }
  }

  const userUpdate = { email };
  if (password && password !== "") {
    userUpdate.password = password;
  }

  if (email || password) {
    await User.findByIdAndUpdate(client.user, userUpdate, {
      new: true,
      runValidators: true,
    });
  }

  client = await Client.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

  const updatedClient = await client.populate({
    path: "user",
    select: "email role",
  });

  res.status(200).json({
    success: true,
    data: updatedClient,
  });
});

// @desc      Delete client
// @route     DELETE /api/v1/clients/:id
// @access    Private/Admin
export const deleteClient = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.params.id);

  if (!client) {
    return next(
      new ErrorResponse(`Client not found with id of ${req.params.id}`, 404)
    );
  }

  if (client.profilePicture) {
    const deleteFile = await File.findById(client.profilePicture);
    if (deleteFile) {
      const fullPath = path.join("public", deleteFile.filePath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error("Error deleting profile picture:", err);
      });
      await deleteFile.deleteOne();
    }
  }
  if (client.companyLogo) {
    const deleteFile = await File.findById(client.companyLogo);
    if (deleteFile) await deleteFile.deleteOne();
    {
      const fullPath = path.join("public", deleteFile.filePath);
      fs.unlink(fullPath, (err) => {
        if (err) console.error("Error deleting company logo:", err);
      });
      await deleteFile.deleteOne();
    }
  }

  await User.findByIdAndDelete(client.user);

  await client.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
    message: "Client and associated user deleted successfully.",
  });
});

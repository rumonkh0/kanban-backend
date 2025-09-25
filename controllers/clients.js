import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "../middleware/async.js";
import fs from "fs";
import Client from "../models/Client.js";
import User from "../models/User.js";
import File from "../models/File.js";
import path from "path";

// @desc      Get all clients
// @route     GET /api/v1/clients
// @access    Private/Admin
export const getClients = asyncHandler(async (req, res, next) => {
  const clients = await Client.find()
    .populate({ path: "user", select: "email" })
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
      select: "email role",
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

  res.status(201).json({
    success: true,
    data: client,
  });
});

// @desc      Update client
// @route     PUT /api/v1/clients/:id
// @access    Private/Admin
export const updateClient = asyncHandler(async (req, res, next) => {
  let client = await Client.findById(req.params.id);
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

  if (email || password) {
    await User.findByIdAndUpdate(
      client.user,
      { email, password },
      {
        new: true,
        runValidators: true,
      }
    );
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

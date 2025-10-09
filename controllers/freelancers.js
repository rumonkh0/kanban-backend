import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";
import Designation from "../models/Designation.js";
import Department from "../models/Department.js";
import Admin from "../models/Admin.js";
import File from "../models/File.js";
import fs from "fs";
import path from "path";
import Task from "../models/Task.js";
import mongoose from "mongoose";
import ProjectMember from "../models/ProjectMember.js";

// @desc      Create a freelancer
// @route     POST /api/v1/freelancers
// @access    Private/Admin
export const createFreelancer = asyncHandler(async (req, res, next) => {
  const { email, password, department, addedBy, ...freelancerData } = req.body;

  // if (designation) {
  //   const d = await Designation.findById(designation);
  //   if (!d) return next(new ErrorResponse("Designation not found.", 404));
  // }
  if (department) {
    const d = await Department.findById(department);
    if (!d) return next(new ErrorResponse("Department not found.", 404));
  }

  const user = await User.create({ email, password, role: "Freelancer" });

  let profilePicture = null;
  if (req.files.profilePicture) {
    console.log(req.files);
    const file = req.files.profilePicture[0];
    try {
      const newFile = await File.create({
        // uploadedBy: req.user._id,
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      profilePicture = newFile._id;
    } catch (err) {
      const fullPath = path.join("public", file.path);
      fs.unlink(file.path, () => {}); // Clean up uploaded file on DB error
      return next(
        new ErrorResponse(`Failed to create file record: ${err.message}`, 500)
      );
    }
  }

  let freelancer;
  try {
    freelancer = await Freelancer.create({
      user: user._id,
      department,
      addedBy,
      profilePicture,
      ...freelancerData,
    });
    user.profile = freelancer._id;
    await user.save();
  } catch (error) {
    const lo = await user.deleteOne();
    console.log(lo);
    return next(error);
  }
  // 5. Link the freelancer profile to the universal user

  res
    .status(201)
    .json({ success: true, message: "Freelancer Created", data: freelancer });
});

// @desc      Get all freelancers
// @route     GET /api/v1/freelancers
// @access    Private/Admin
export const getFreelancers = asyncHandler(async (req, res, next) => {
  const freelancers = await Freelancer.find()
    .populate({
      path: "user",
      select: "email role",
    })
    // .populate("designation")
    .populate("department")
    // .populate("addedBy")
    .populate("profilePicture");

  // Map freelancers with task count
  const freelancersWithCount = await Promise.all(
    freelancers.map(async (freelancer) => {
      const count = await Task.countDocuments({ members: freelancer._id });
      return {
        ...freelancer.toObject(),
        taskCount: count,
      };
    })
  );
  res.status(200).json({
    success: true,
    count: freelancers.length,
    data: freelancersWithCount,
  });
});

// @desc      Get freelancer stat
// @route     GET /api/v1/freelancers/:id/stat
// @access    Private/Admin
export const getMemberStats = asyncHandler(async (req, res) => {
  try {
    const { freelancerId } = req.params;
    const memberObjectId = new mongoose.Types.ObjectId(freelancerId);

    // 🕒 Normalize today's date to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 📊 Task Stats
    const taskStats = await Task.aggregate([
      { $match: { members: memberObjectId } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          activeTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "Active"] }, 1, 0],
            },
          },
          completedTasks: {
            $sum: {
              $cond: [{ $eq: ["$status", "Completed"] }, 1, 0],
            },
          },
          dueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", "Active"] },
                    { $gte: ["$dueDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$status", "Completed"] },
                    { $lt: ["$dueDate", today] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const {
      totalTasks = 0,
      activeTasks = 0,
      dueTasks = 0,
      overdueTasks = 0,
      completedTasks = 0,
    } = taskStats[0] || {};

    // 💰 Payment Stats from ProjectMember
    const paymentStats = await ProjectMember.aggregate([
      { $match: { freelancer: memberObjectId } },
      {
        $group: {
          _id: null,
          amountPaid: { $sum: "$amountPaid" },
          amountOwed: { $sum: "$amountOwed" },
        },
      },
    ]);

    const { amountPaid = 0, amountOwed = 0 } = paymentStats[0] || {};

    res.json({
      success: true,
      data: {
        freelancerId,
        totalTasks,
        activeTasks,
        dueTasks,
        overdueTasks,
        completedTasks,
        amountPaid,
        amountOwed,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get member stats" });
  }
});

// @desc      Get a single freelancer
// @route     GET /api/v1/freelancers/:id
// @access    Private/Admin
export const getFreelancer = asyncHandler(async (req, res, next) => {
  const freelancer = await Freelancer.findById(req.params.id)
    .populate({ path: "user", select: "email role" })
    // .populate("designation")
    .populate("department")
    // .populate("addedBy")
    .populate("profilePicture");

  if (!freelancer) {
    return next(
      new ErrorResponse(`Freelancer not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({ success: true, data: freelancer });
});

// @desc      Update a freelancer
// @route     PUT /api/v1/freelancers/:id
// @access    Private/Admin
export const updateFreelancer = asyncHandler(async (req, res, next) => {
  const { email, password, designation, department, ...updateData } = req.body;
  let id = req.params.id;
  if (req.user.role === "Freelancer") id = req.user.profile._id;
  let freelancer = await Freelancer.findById(id);

  if (!freelancer) {
    return next(
      new ErrorResponse(`Freelancer not found with id of ${req.params.id}`, 404)
    );
  }

  // Update universal user account
  if (email || password) {
    await User.findByIdAndUpdate(freelancer.user, { email, password });
  }

  // if (designation) {
  //   const d = await Designation.findById(designation);
  //   if (!d) return next(new ErrorResponse("Designation not found.", 404));
  // }
  if (department) {
    const d = await Department.findById(department);
    if (!d) return next(new ErrorResponse("Department not found.", 404));
  }

  // Handle profile picture update
  // console.log(req.files);
  if (req.files) {
    if (req.files.profilePicture) {
      if (freelancer.profilePicture) {
        const oldFile = await File.findById(freelancer.profilePicture);
        if (oldFile) {
          const fullPath = path.join("public", oldFile.filePath);
          fs.unlink(oldFile.filePath, (err) => {
            if (err)
              console.error("Error deleting old profile picture file:", err);
          });
          await File.findByIdAndDelete(oldFile._id);
        }
      }

      const file = req.files.profilePicture[0];
      const newFile = await File.create({
        // uploadedBy: req.user._id,
        filePath: path.relative("public", file.path),
        mimeType: file.mimetype,
        fileSize: file.size,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.filename.split(".").pop(),
      });
      updateData.profilePicture = newFile._id;
    }
  }
  // console.log(req.body);
  const updatedFreelancer = await Freelancer.findByIdAndUpdate(
    req.params.id,
    { ...updateData, designation, department },
    { new: true, runValidators: true }
  )
    .populate({ path: "user", select: "email role" })
    // .populate("designation")
    .populate("department")
    .populate("profilePicture");
  // .populate("addedBy")

  res.status(200).json({ success: true, data: updatedFreelancer });
});

// @desc      Delete a freelancer
// @route     DELETE /api/v1/freelancers/:id
// @access    Private/Admin
export const deleteFreelancer = asyncHandler(async (req, res, next) => {
  const freelancer = await Freelancer.findById(req.params.id);

  if (!freelancer) {
    return next(
      new ErrorResponse(`Freelancer not found with id of ${req.params.id}`, 404)
    );
  }

  // Delete associated user
  await User.findByIdAndDelete(freelancer.user);

  // Delete associated profile picture file
  if (freelancer.profilePicture) {
    const file = await File.findById(freelancer.profilePicture);
    if (file) {
      const fullPath = path.join("public", file.filePath);
      fs.unlink(file.filePath, (err) => {
        if (err) console.error("Error deleting profile picture file:", err);
      });
      await File.findByIdAndDelete(file._id);
    }
  }

  await freelancer.deleteOne();

  res.status(200).json({ success: true, data: {} });
});

import asyncHandler from "../middleware/async.js";
import Freelancer from "../models/Freelancer.js";
import User from "../models/User.js";

// @desc      Create freelancer
// @route     POST /api/v1/freelancer
// @access    Private/Admin
export const createFreelancer = asyncHandler(async (req, res, next) => {
  const { email, password, ...profileData } = req.body;
  let profilePicture;
  if (req.files.profilePicture) {
    profilePicture = req.files.profilePicture[0].path;
  }

  const user = await User.create({
    email,
    password,
    role: "freelancer",
  });
  const freelancer = await Freelancer.create({
    user: user._id,
    ...profileData,
    profilePicture,
  });

  const freelancerData = freelancer.toObject();
  freelancerData.email = user.email;

  res.status(201).json({
    success: true,
    data: freelancerData,
  });
});

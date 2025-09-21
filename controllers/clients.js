import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "../middleware/async.js";
import Client from "../models/Client.js";
import User from "../models/User.js";

// @desc      Create client
// @route     POST /api/v1/clients
// @access    Private/Admin
export const createClient = asyncHandler(async (req, res, next) => {
  const { email, password, ...profileData } = req.body;
  let profilePicture, companyLogo;
  if (req.files.profilePicture) {
    profilePicture = req.files.profilePicture[0].path;
  }

  if (req.files.companyLogo) {
    companyLogo = req.files.companyLogo[0].path;
  }
  const user = await User.create({
    email,
    password,
    role: "client",
  });
  const client = await Client.create({
    user: user._id,
    ...profileData,
    profilePicture,
    companyLogo,
  });

  const clientData = client.toObject();
  clientData.email = user.email;

  res.status(201).json({
    success: true,
    data: clientData,
  });
});

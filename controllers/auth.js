import ErrorResponse from "../utils/errorResponse.js";
import asyncHandler from "../middleware/async.js";
import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";
import SecuritySetting from "../models/SecuritySetting.js";

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public
// export const login = asyncHandler(async (req, res, next) => {
//   const { email, password } = req.body;

//   // Validate emil & password
//   if (!email || !password) {
//     return next(new ErrorResponse("Please provide an email and password", 400));
//   }

//   // Check for user
//   const user = await User.findOne({ email })
//     .select("+password")
//     .populate({
//       path: "profile",
//       populate: {
//         path: "profilePicture",
//         select: "filePath",
//       },
//     });
//   if (!user) {
//     return next(new ErrorResponse("Invalid credentials", 401));
//   }

//   // Check if password matches
//   const isMatch = await user.matchPassword(password);

//   if (!isMatch) {
//     return next(new ErrorResponse("Invalid credentials", 401));
//   }

//   user.lastLogin = Date.now();
//   await user.save();

//   sendTokenResponse(user, 200, res);
// });

export const login = asyncHandler(async (req, res, next) => {
  const { email, password, recaptchaToken } = req.body;

  // Validate email & password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // 1. Check reCAPTCHA settings and verify token
  const settings = await SecuritySetting.findOne({}); // Fetch active settings
  const activeVersion = settings?.recaptchaVersion || "none"; // Default to 'none' or 'v2'

  if (activeVersion !== "none") {
    if (!recaptchaToken) {
      return next(new ErrorResponse("reCAPTCHA token is missing.", 403));
    }

    const verificationResult = await verifyRecaptcha(
      recaptchaToken,
      activeVersion
    );

    if (!verificationResult.success) {
      console.error(
        "reCAPTCHA verification failed:",
        verificationResult["error-codes"]
      );
      return next(
        new ErrorResponse("Failed security check. Please try again.", 403)
      );
    }

    // V3 Specific Check (Check score threshold)
    if (activeVersion === "v3" && verificationResult.score < 0.5) {
      console.warn(`reCAPTCHA V3 score too low: ${verificationResult.score}`);
      return next(
        new ErrorResponse("Failed security check. Access denied.", 403)
      );
    }
    // Note: You might want to also check verificationResult.action === 'login' for V3
  }

  // 2. Check for user
  const user = await User.findOne({ email })
    .select("+password")
    .populate({
      path: "profile",
      populate: {
        path: "profilePicture",
        select: "filePath",
      },
    });

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // 3. Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // 4. Update last login and send token
  user.lastLogin = Date.now();
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc      Get current logged in user
// @route     GET /api/v1/auth/me
// @access    Private
export const getMe = asyncHandler(async (req, res, next) => {
  // user is already available in req due to the protect middleware
  const user = req.user;

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Update user details
// @route     PUT /api/v1/auth/forgotpassword
// @access    Private
export const forgotPasswordWithOTP = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(200).json({ success: true, data: "Email sent" });
  }
  const otp = await user.getOTP();

  await user.save({ validateBeforeSave: false });

  const message = `
    Your password reset OTP is:
    
    ${otp}
    
    This OTP is valid for 10 minutes.
    If you did not request this, please ignore this email.
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Password Reset OTP",
      message,
    });

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.error(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

// @desc      Update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private
export const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc      Forgot password
// @route     POST /api/v1/auth/forgotpassword
// @access    Public
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email }).populate(
    "profile"
  );

  if (!user) {
    return next(new ErrorResponse("There is no user with that email", 404));
  }

  // Get reset token
  const otp = await user.getOTP();
  console.log(otp);
  await user.save({ validateBeforeSave: false });
  try {
    await sendEmail({
      email: user.email,
      subject: `Your password reset otp is - ${otp}`,
      template: "resetPassword",
      context: {
        name: user.profile.name,
        otp: otp,
        date: new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      },
    });

    res.status(200).json({ success: true, data: "Email sent" });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse("Email could not be sent", 500));
  }
});

// @desc      Forgot password
// @route     POST /api/v1/auth/verifyotp
// @access    Public

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword
// @access    Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(
      new ErrorResponse("Email, OTP, and new password are required.", 400)
    );
  }

  // Find the user by their email
  const user = await User.findOne({ email }).select(
    "+resetPasswordToken +resetPasswordExpire"
  );

  if (!user) {
    return next(new ErrorResponse("User not found.", 404));
  }
  // Check if the OTP is expired
  if (user.resetPasswordExpire < Date.now()) {
    return next(
      new ErrorResponse("OTP has expired. Please request a new one.", 400)
    );
  }
  // Verify the provided OTP

  const isMatch = await user.verifyOTP(otp);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid OTP.", 400));
  }

  // Set the new password
  user.password = newPassword;

  // Clear the OTP fields
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  // Save the user with the new password (Mongoose's `pre('save')` will hash it)
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // const options = {
  //   expires: new Date(
  //     Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
  //   ),
  //   sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  //   secure: process.env.NODE_ENV === "production",
  //   maxAge: 1000 * 60 * 60 * 24, // 1 day
  // };

  // if (process.env.NODE_ENV === "production") {
  //   options.secure = true;
  // }
  user = { email: user.email, role: user.role, user: user.profile };
  res.status(statusCode).json({
    success: true,
    token,
    data: user,
  });
};

const getSecretKey = (version) => {
  // Replace with your actual ENV variables
  if (version === "v3") return process.env.RECAPTCHA_V3_SECRET_KEY;
  if (version === "v2") return process.env.RECAPTCHA_V2_SECRET_KEY;
  return null;
};

export const verifyRecaptcha = async (token, version) => {
  const secret = getSecretKey(version);

  if (!secret) {
    return {
      success: false,
      "error-codes": ["invalid-security-configuration"],
    };
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          secret: secret,
          response: token,
        }),
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      "Error communicating with Google reCAPTCHA API:",
      error.message
    );
    return { success: false, "error-codes": ["api-communication-failure"] };
  }
};

import asyncHandler from "../middleware/async.js";
import ErrorResponse from "../utils/errorResponse.js";

import Admin from "../models/Admin.js";
import ThemeSetting from "../models/AdminTheme.js";
import BusinessAddress from "../models/BusinessAddress.js";
import CompanySetting from "../models/CompanySetting.js";
import SecuritySetting from "../models/SecuritySetting.js";
import { handleFileUploads } from "../utils/fileHandler.js";
import User from "../models/User.js";

const getSetting = (Model, modelName) =>
  asyncHandler(async (req, res, next) => {
    const setting = await Model.findOne();

    if (!setting) {
      return next(new ErrorResponse(`${modelName} settings not found.`, 404));
    }

    res.status(200).json({
      success: true,
      data: setting,
    });
  });

export const getAdminSetting = asyncHandler(async (req, res, next) => {
  const setting = await Admin.findOne().populate([
    {
      path: "user",
      select: "email",
    },
    {
      path: "profilePicture",
      select: "filePath",
    },
  ]);

  if (!setting) {
    return next(new ErrorResponse(`${modelName} settings not found.`, 404));
  }

  res.status(200).json({
    success: true,
    data: setting,
  });
});

const editSetting = (Model, modelName, fileFields = []) =>
  asyncHandler(async (req, res, next) => {
    // Start with data from req.body
    const updates = req.body;

    // Find the existing document
    let setting = await Model.findOne();
    const isNew = !setting;

    if (Model.collection.collectionName === "admins") {
      if (req.body.password && req.body.password !== "") {
        await User.findByIdAndUpdate(
          setting.user,
          { password: req.body.password },
          {
            new: true,
            runValidators: true,
          }
        );
      }
    }
    // --- FILE HANDLING INTEGRATION ---
    if (req.files && fileFields.length > 0) {
      await handleFileUploads(
        setting || {},
        updates,
        req.files,
        fileFields,
        next
      );
    }

    // If document is new, create it
    if (isNew) {
      setting = await Model.create(updates);
      return res.status(201).json({
        success: true,
        message: `${modelName} settings created successfully.`,
        data: setting,
      });
    }

    // If document exists, UPDATE it
    setting = await Model.findByIdAndUpdate(setting._id, updates, {
      new: true,
      runValidators: true,
      context: "query",
    });

    res.status(200).json({
      success: true,
      message: `${modelName} settings updated successfully.`,
      data: setting,
    });
  });

// --- 1. Admin Settings (for the logged-in user's administrative profile)
// export const getAdminSetting = getSetting(Admin, "Admin");
export const editAdminSetting = editSetting(Admin, "Admin", ["profilePicture"]);

// --- 2. Theme Settings
export const getThemeSetting = getSetting(ThemeSetting, "ThemeSetting");
export const editThemeSetting = editSetting(ThemeSetting, "ThemeSetting", [
  "lightModeLogo",
  "darkModeLogo",
  "loginBackgroundImage",
  "faviconImage",
]);

// --- 3. Business Address Settings
export const getBusinessAddress = getSetting(
  BusinessAddress,
  "BusinessAddress"
);
export const editBusinessAddress = editSetting(
  BusinessAddress,
  "BusinessAddress"
);

// --- 4. Company Settings
export const getCompanySetting = getSetting(CompanySetting, "CompanySetting");
export const editCompanySetting = editSetting(CompanySetting, "CompanySetting");

// --- 5. Security Settings
export const getSecuritySetting = getSetting(
  SecuritySetting,
  "SecuritySetting"
);
export const editSecuritySetting = editSetting(
  SecuritySetting,
  "SecuritySetting"
);

export const getAllThemeSetting = asyncHandler(async (req, res, next) => {
  const theme = await ThemeSetting.findOne().populate({
    path: [
      "lightModeLogo",
      "darkModeLogo",
      "loginBackgroundImage",
      "faviconImage",
    ],
    select: "filePath",
  });
  const company = await CompanySetting.findOne();

  res.status(200).json({
    success: true,
    data: { company, theme },
  });
});

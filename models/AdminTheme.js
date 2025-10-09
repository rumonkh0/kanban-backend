import mongoose from "mongoose";

const themeSettingSchema = new mongoose.Schema(
  {
    appName: { type: String, required: true, trim: true },
    brandingStyle: {
      type: String,
      enum: ["style1", "style2", "style3"],
      default: "style1",
    },

    lightModeLogo: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    darkModeLogo: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    loginBackgroundImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    faviconImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    loginLogoTxtColor: {
      type: String,
      enum: ["Light", "Dark"],
      default: "Dark",
    },

    // Public theme settings
    publicPrimaryColor: { type: String, default: "#000000" },
    publicTheme: { type: String, enum: ["Light", "Dark"], default: "Dark" },

    // Admin theme settings
    adminPrimaryColor: { type: String, default: "#000000" },
    adminTheme: { type: String, enum: ["Light", "Dark"], default: "Dark" },

    // Employee theme settings
    employeePrimaryColor: { type: String, default: "#000000" },
    employeeTheme: { type: String, enum: ["Light", "Dark"], default: "Dark" },

    // Client theme settings
    clientPrimaryColor: { type: String, default: "#000000" },
    clientTheme: { type: String, enum: ["Light", "Dark"], default: "Dark" },
  },
  { timestamps: true }
);

export default mongoose.model("ThemeSetting", themeSettingSchema);

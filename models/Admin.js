import mongoose from "mongoose";

const adminprofileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    emailNotifications: { type: Boolean, default: true }, 
    googleCalendar: { type: Boolean, default: true }, 

    country: { type: String, default: "USA", trim: true },
    mobile: {
      countryCode: { type: String, trim: true },
      number: { type: String, trim: true },
    },

    language: { type: String, default: "English", trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    dateOfBirth: { type: Date },

    slackMemberId: { type: String, trim: true },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Other"],
      default: "Single",
    },
    address: { type: String, trim: true },

    emergencyEmail: { type: String, trim: true },
    emergencyPhone: {
      countryCode: { type: String, trim: true },
      number: { type: String, trim: true },
    },
    // role: "admin",
  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminprofileSchema);

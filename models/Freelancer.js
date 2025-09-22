import mongoose from "mongoose";

const freelancerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    memberId: { type: String, unique: true, trim: true },
    salutation: {
      type: String,
      enum: ["Mr", "Mrs", "Ms", "Dr", "Other"],
      default: "Mr",
    },
    name: { type: String, required: true, trim: true },

    designation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Designation",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    country: { type: String, default: "USA", trim: true },

    mobile: {
      countryCode: { type: String, trim: true },
      number: { type: String, trim: true },
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },

    joiningDate: { type: Date },
    dob: { type: Date },
    language: { type: String, default: "English", trim: true },
    designationRole: { type: String, trim: true },

    address: { type: String, trim: true },
    about: { type: String, trim: true },

    //Other Details
    loginAllowed: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },

    averageRate: { type: Number, default: 0 },
    slackId: { type: String, trim: true },

    skills: [{ type: String, trim: true }], // array of skills

    probationEndDate: { type: Date },
    noticePeriodStartDate: { type: Date },
    noticePeriodEndDate: { type: Date },
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern", "Other"],
      trim: true,
    },

    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Other"],
      default: "Single",
    },
    businessAddress: { type: String, trim: true },

    accountStatus: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },

    profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
  },
  { timestamps: true }
);

export default mongoose.model("Freelancer", freelancerSchema);

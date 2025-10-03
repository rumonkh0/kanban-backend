import mongoose from "mongoose";

const companySettingSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    companyEmail: { type: String, required: true, lowercase: true, trim: true },
    companyPhone: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("CompanySetting", companySettingSchema);

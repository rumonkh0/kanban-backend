import mongoose from "mongoose";

const securitySettingSchema = new mongoose.Schema(
  {
    emailAuthEnabled: { type: Boolean, default: false },
    smsAuthEnabled: { type: Boolean, default: false },
    googleRecaptchaEnabled: { type: Boolean, default: false },

    recaptchaVersion: {
      type: String,
      enum: ["v2", "v3", "none"],
      default: "none",
    },
    recaptchaV2Key: { type: String, default: "" },
    recaptchaV2Secret: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SecuritySetting", securitySettingSchema);

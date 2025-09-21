import mongoose from "mongoose";

const securitySettingSchema = new mongoose.Schema(
  {
    emailAuthEnabled: { type: Boolean, default: false },
    smsAuthEnabled: { type: Boolean, default: false },
    googleRecaptchaEnabled: { type: Boolean, default: false },

    recaptchaVersion: { type: String, enum: ["V2", "V3"], default: "V2" },
    recaptchaV2Key: { type: String, default: "" },
    recaptchaV2Secret: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SecuritySetting", securitySettingSchema);

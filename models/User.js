import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["Admin", "Client", "Freelancer"],
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "role",
    },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },
  },
  { timestamps: true }
);

// Encrypt password using bcrypt
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  next();
});

// Delete associated profile before deleting the user
userSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    if (this.profile) {
      const profileModel = this.model(this.role);
      if (profileModel) {
        await profileModel.deleteOne({ _id: this.profile });
      }
    }
    next();
  }
);

userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get OTP
userSchema.methods.getOTP = async function () {
  const OTP = String(Math.floor(1000 + Math.random() * 9000));

  const saltRounds = 10;
  const hashedOTP = await bcrypt.hash(OTP, saltRounds);

  this.resetPasswordToken = hashedOTP;
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return OTP;
};

// Method to verify OTP
userSchema.methods.verifyOTP = async function (OTP) {
  return await bcrypt.compare(OTP, this.resetPasswordToken);
};

export default mongoose.model("User", userSchema);

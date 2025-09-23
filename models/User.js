import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);

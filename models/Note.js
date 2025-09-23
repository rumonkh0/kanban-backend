import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      // Only required if the note is not public
      required: function () {
        return !this.isPublic;
      },
      select: false,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      //   required: true,
    },
  },
  { timestamps: true }
);

// Encrypt password using bcrypt before saving
noteSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isPublic) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
noteSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
  }
  next();
});
noteSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("Note", noteSchema);

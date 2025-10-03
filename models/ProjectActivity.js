import mongoose from "mongoose";

const projectActivitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Export the default model
export default mongoose.model("ProjectActivity", projectActivitySchema);

import mongoose from "mongoose";

const stageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    color: { type: String, default: "#ffffff", trim: true },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

stageSchema.index({ project: 1, order: 1 }, { unique: true });

export default mongoose.model("Stage", stageSchema);

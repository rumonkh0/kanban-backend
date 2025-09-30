import mongoose from "mongoose";

const stageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    color: { type: String, default: "#ffffff", trim: true },
    order: { type: String, default: "a" },
  },
  { timestamps: true }
);

export default mongoose.model("Stage", stageSchema);

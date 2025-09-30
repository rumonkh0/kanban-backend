import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    stage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stage",
      required: true,
    },

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" }],

    createdDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],

    order: { type: String, default: "a" },

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "Blocked"],
      default: "Not Started",
    },
  },
  { timestamps: true }
);

taskSchema.index({ stage: 1, order: 1 }, { unique: true });

export default mongoose.model("Task", taskSchema);

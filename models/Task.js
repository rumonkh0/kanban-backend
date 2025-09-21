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
    }, // which column

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" }],

    createdDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    files: [{ type: String }],
    images: [{ type: String }],

    order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "Completed", "Blocked"],
      default: "Not Started",
    },
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Freelancer",
          required: true,
        },
        content: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({ stage: 1, order: 1 }, { unique: true });

export default mongoose.model("Task", taskSchema);

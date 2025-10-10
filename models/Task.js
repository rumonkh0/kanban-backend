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

    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    completionDate: { type: Date, default: null },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
    coverImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },

    order: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Completed"],
      default: "Active",
    },
  },
  { timestamps: true }
);

taskSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "task",
  justOne: false,
});

taskSchema.set("toObject", { virtuals: true });
taskSchema.set("toJSON", { virtuals: true });

taskSchema.index({ stage: 1, order: 1 }, { unique: true });

export default mongoose.model("Task", taskSchema);

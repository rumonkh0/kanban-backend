import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      required: true,
    },
    haveToPay: {
      type: Number,
      required: true,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountOwed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
projectMemberSchema.index({ project: 1, freelancer: 1 }, { unique: true });

export default mongoose.model("ProjectMember", projectMemberSchema);

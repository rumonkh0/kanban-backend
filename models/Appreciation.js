import mongoose from "mongoose";

const appreciationSchema = new mongoose.Schema(
  {
    awardName: {
      type: String,
      required: true,
      trim: true,
    },
    givingBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    givingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Appreciation", appreciationSchema);

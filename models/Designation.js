import mongoose from "mongoose";

const designationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

export default mongoose.model("Designation", designationSchema);

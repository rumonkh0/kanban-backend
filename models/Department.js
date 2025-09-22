import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

export default mongoose.model("Department", departmentSchema);

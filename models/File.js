import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    filePath: { type: String, required: true },
    mimeType: { type: String },
    fileSize: { type: Number },
    fileName: { type: String },
    originalName: { type: String },
    fileType: { type: String },
    linkedTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    linkedModel: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("File", fileSchema);

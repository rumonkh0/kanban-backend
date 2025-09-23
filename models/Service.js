import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, trim: true },

    // Payment details
    clientsPay: { type: Number, default: 0 },
    teamsPayment: { type: Number, default: 0 },

    freelancers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Freelancer",
      },
    ],

    description: { type: String, trim: true },
    addons: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.model("Service", serviceSchema);

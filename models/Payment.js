import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" }, // optional, if linked to a client

    toBePaid: { type: Number, required: true, default: 0 }, // total payable amount
    discount: { type: Number, default: 0 },

    paymentDate: { type: Date },
    amountPaid: { type: Number, default: 0 },
    amountOwed: { type: Number, default: 0 },

    paidMethod: {
      type: String,
      enum: ["Credit Card", "Bank Transfer", "PayPal", "Cash", "Other"],
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Owed", "Partial", "Paid", "Overdue"],
      default: "Owed",
    },

    invoiceNo: { type: String, unique: true, trim: true },
    relatedFile: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);

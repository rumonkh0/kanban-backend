import mongoose from "mongoose";

const teamPaymentSchema = new mongoose.Schema(
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

    toBePaid: { type: Number, required: true, default: 0 },
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

export default mongoose.model("TeamPayment", teamPaymentSchema);

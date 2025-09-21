import mongoose from "mongoose";

const trackerSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },
    companyName: { type: String },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Freelancer",
      default: null,
    },

    startDate: { type: Date },
    dueDate: { type: Date },
    description: { type: String },
    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold"],
      default: "Active",
    },

    // Pricing and discount
    price: { type: Number, default: 0 },
    customPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalAmountForClient: { type: Number, default: 0 },

    // Client payments
    modeOfPayment: { type: String },
    datePaidByClient: { type: Date },
    amountPaidByClient: { type: Number, default: 0 },
    amountOwedByClient: { type: Number, default: 0 },

    // Team member payments
    amountPayableToMembers: { type: Number, default: 0 },
    datePaidToMembers: { type: Date },
    amountPaidToMembers: { type: Number, default: 0 },
    amountOwedToMembers: { type: Number, default: 0 },

    // Final earning
    finalAmountEarned: { type: Number, default: 0 },

    // Misc
    comments: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Tracker", trackerSchema);

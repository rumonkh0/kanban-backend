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
    // discount: { type: Number, default: 0 },

    paymentDate: { type: Date },
    amountPaid: { type: Number, default: 0 },
    amountOwed: { type: Number, default: 0 },

    paidMethod: {
      type: String,
      enum: ["Credit Card", "Bank Transfer", "PayPal", "Stripe", "Other"],
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Owed", "Partial", "Paid", "Overdue"],
      default: "Owed",
    },

    invoiceNo: { type: String, unique: true, trim: true },
    relatedFile: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
  },
  { timestamps: true }
);


teamPaymentSchema.statics.calculateTotalPaid = async function (
  projectId,
  freelancerId
) {
  // Aggregate all payments for the given project
  const result = await this.aggregate([
    {
      $match: { project: projectId },
    },
    {
      $group: {
        _id: "$project",
        totalPaid: { $sum: "$amountPaid" },
      },
    },
  ]);

  const totalPaid = result.length > 0 ? result[0].totalPaid : 0;

  try {
    // 1. FIND the Project document
    const projectMember = await this.model("ProjectMember").findOne({
      freelancer: freelancerId,
      project: projectId,
    });

    if (!projectMember) {
      console.error(
        `Project member not found with project ID: ${projectId} and freelance ID: ${freelancerId}}`
      );
      return;
    }

    // 2. EDIT the document property
    projectMember.amountPaid = totalPaid;

    // 3. SAVE the document
    // This explicitly triggers the projectSchema.pre('save') hook
    await projectMember.save();
  } catch (err) {
    console.error(`Error updating Project ${projectId}: ${err.message}`);
  }
};

// 1. Post-Save: Runs after a payment is created or updated
teamPaymentSchema.post("save", async function () {
  await this.constructor.calculateTotalPaid(this.project, this.freelancer);
});

export default mongoose.model("TeamPayment", teamPaymentSchema);

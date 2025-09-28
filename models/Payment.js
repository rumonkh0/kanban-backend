import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    // discount: { type: Number, default: 0 },
    projectPrice: { type: Number, default: 0 },
    haveToPay: { type: Number, default: 0 },
    toBePaid: { type: Number, required: true, default: 0 },
    paymentDate: { type: Date },
    amountPaid: { type: Number, default: 0 },
    amountOwed: { type: Number, default: 0 },

    paidMethod: {
      type: String,
      enum: ["Credit Card", "Bank Transfer", "Stripe", "PayPal"],
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Owed", "Partial", "Paid", "Overdue"],
      default: "Paid",
    },

    invoiceNo: { type: String, unique: true, trim: true },
    relatedFile: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
  },
  { timestamps: true }
);

paymentSchema.statics.calculateTotalPaid = async function (projectId) {
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
    const project = await this.model("Project").findById(projectId);

    if (!project) {
      console.error(`Project not found with ID: ${projectId}`);
      return;
    }

    // 2. EDIT the document property
    project.amountPaidByClient = totalPaid;

    // 3. SAVE the document
    // This explicitly triggers the projectSchema.pre('save') hook
    await project.save();
  } catch (err) {
    console.error(`Error updating Project ${projectId}: ${err.message}`);
  }
};

// 1. Post-Save: Runs after a payment is created or updated
paymentSchema.post("save", async function () {
  await this.constructor.calculateTotalPaid(this.project);
});

// 2. Post-Delete: Runs after a payment is deleted
paymentSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await this.constructor.calculateTotalPaid(this.project);
  }
);

export default mongoose.model("Payment", paymentSchema);

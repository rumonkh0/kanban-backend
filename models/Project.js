import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    shortCode: { type: String, unique: true, trim: true },
    projectName: { type: String, required: true, trim: true },

    startDate: { type: Date },
    dueDate: { type: Date },
    noDeadline: { type: Boolean, default: false },

    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],

    client: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Freelancer" }],

    summary: { type: String, trim: true },

    ganttChart: { type: Boolean, default: true },
    taskBoard: { type: Boolean, default: true },
    taskApproval: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["Not Started", "In Progress", "On Hold", "Completed", "Cancelled"],
      default: "In Progress",
    },
    completionDate: { type: Date, default: null },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    calculateProgress: { type: Boolean, default: false },

    archive: { type: Boolean, default: false },
    pin: { type: Boolean, default: false },

    notifyClients: { type: Boolean, default: false },

    relatedFiles: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],

    // tracker part

    description: { type: String },
    status: {
      type: String,
      enum: ["Active", "Completed", "On Hold"],
      default: "Active",
    },

    // Pricing and discount
    projectPrice: { type: Number, default: 0 },
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
    // datePaidToMembers: { type: Date },
    amountPaidToMembers: { type: Number, default: 0 },
    amountOwedToMembers: { type: Number, default: 0 },

    // Final earning
    finalAmountEarned: { type: Number, default: 0 },

    // Misc
    comments: { type: String },
  },
  { timestamps: true }
);

// ... existing schema definition ...

// ... existing schema definition ...

projectSchema.pre("save", function (next) {
  // Flag to track if any calculation was made
  let recalculateFinalAmountEarned = false;

  // 1. --- Client Pricing Calculation ---
  if (
    this.isNew ||
    this.isModified("projectPrice") ||
    this.isModified("customPrice") ||
    this.isModified("discount")
  ) {
    let basePrice = 0;

    if (this.customPrice > 0) {
      basePrice = this.customPrice;
    } else {
      basePrice = this.projectPrice;
    }

    if (this.discount > 0 && basePrice > 0) {
      const discountAmount = basePrice * (this.discount / 100);
      this.finalAmountForClient = basePrice - discountAmount;
    } else {
      this.finalAmountForClient = basePrice;
    }
    recalculateFinalAmountEarned = true;
  }

  // 2. --- Member Payment Calculation (Owed to Members) ---
  if (
    this.isModified("amountPayableToMembers") ||
    this.isModified("amountPaidToMembers") ||
    this.isNew
  ) {
    this.amountOwedToMembers =
      this.amountPayableToMembers - this.amountPaidToMembers;

    if (this.amountOwedToMembers < 0) {
      this.amountOwedToMembers = 0;
    }
    recalculateFinalAmountEarned = true;
  }

  // 3. --- Client Owed Amount Calculation (FIXED TRIGGER) ---
  // This runs if the billed amount changes OR if the total amount paid changes
  // (which happens via the Payment model hook).
  if (
    this.isModified("finalAmountForClient") ||
    this.isModified("amountPaidByClient") ||
    this.isNew
  ) {
    // amountOwedByClient = finalAmountForClient - amountPaidByClient
    this.amountOwedByClient =
      this.finalAmountForClient - this.amountPaidByClient;

    if (this.amountOwedByClient < 0) {
      this.amountOwedByClient = 0;
    }
    recalculateFinalAmountEarned = true;
  }

  // 4. --- Final Earning Calculation (Net Profit) ---
  if (recalculateFinalAmountEarned) {
    this.finalAmountEarned =
      this.finalAmountForClient - this.amountPayableToMembers;
  }

  next();
});

// Middleware to delete all associated ProjectMember documents when a Project is deleted
projectSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    await this.model("ProjectMember").deleteMany({ project: this._id });
    await this.model("ProjectActivity").deleteMany({ project: this._id });
    next();
  }
);

export default mongoose.model("Project", projectSchema);

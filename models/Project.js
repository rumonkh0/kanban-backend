import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    shortCode: { type: String, unique: true, trim: true },
    projectName: { type: String, required: true, trim: true },

    startDate: { type: Date },
    dueDate: { type: Date },
    noDeadline: { type: Boolean, default: false },

    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    department: [{ type: String, trim: true }],

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

export default mongoose.model("Project", projectSchema);

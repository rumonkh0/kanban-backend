import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    shortCode: { type: String, unique: true, trim: true },
    projectName: { type: String, required: true, trim: true },

    startDate: { type: Date },
    dueDate: { type: Date },
    noDeadline: { type: Boolean, default: false },

    service: { type: String, trim: true },
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

    // Financials
    projectPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    teamMembersPay: { type: Number, default: 0 },
    amountPaidByClient: { type: Number, default: 0 },
    amountOwedByClient: { type: Number, default: 0 },
    amountPaidToTeam: { type: Number, default: 0 },
    amountOwedToTeam: { type: Number, default: 0 },

    notifyClients: { type: Boolean, default: false },

    relatedFile: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);

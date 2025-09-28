import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
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
    haveToPay: {
      type: Number,
      required: true,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountOwed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
projectMemberSchema.index({ project: 1, freelancer: 1 }, { unique: true });

projectMemberSchema.statics.calculateProjectPaidToMembers = async function (
  projectId
) {
  console.log("i ran");
  // 1. Aggregate payments for the project
  const result = await this.aggregate([
    { $match: { project: projectId } },
    {
      $group: {
        _id: "$project",
        totalPaid: { $sum: "$amountPaid" },
      },
    },
  ]);

  const totalPaid = result.length > 0 ? result[0].totalPaid : 0;

  try {
    // 2. Find, Edit, and Save the Project document
    const Project = this.model("Project");
    const project = await Project.findById(projectId);

    if (project) {
      // Set the total amount paid to all members
      project.amountPaidToMembers = totalPaid;

      // Use save() to trigger Project's pre('save') middleware
      await project.save();
    }
  } catch (err) {
    console.error(
      `Error synchronizing Project ${projectId} paid amounts: ${err.message}`
    );
  }
};

// --- DOCUMENT MIDDLEWARE HOOKS ---

// 1. Pre-Save Hook: Calculates owed amount and validates 'haveToPay'
projectMemberSchema.pre("save", async function (next) {
  // --- A. Internal Calculation: Calculate amountOwed ---
  if (this.isModified("amountPaid")) {
    this._amountPaidWasModified = this.isModified("amountPaid");
  }
  if (
    this.isModified("haveToPay") ||
    this.isModified("amountPaid") ||
    this.isNew
  ) {
    // amountOwed = haveToPay - amountPaid
    const newAmountOwed = this.haveToPay - this.amountPaid;
    this.amountOwed = newAmountOwed > 0 ? newAmountOwed : 0;
  }

  // --- B. Validation: Prevent total 'haveToPay' from exceeding Project's total payable ---
  if (this.isModified("haveToPay")) {
    const Project = this.model("Project");
    const projectId = this.project;

    // 1. Find the sum of 'haveToPay' for all other members of this project
    const projectMembers = await this.constructor.aggregate([
      { $match: { project: projectId, _id: { $ne: this._id } } },
      {
        $group: { _id: null, sumOfOtherMembersPayable: { $sum: "$haveToPay" } },
      },
    ]);
    const currentSumOfOthers =
      projectMembers.length > 0
        ? projectMembers[0].sumOfOtherMembersPayable
        : 0;

    // 2. Calculate the new total payable amount for the project
    const newTotalPayable = currentSumOfOthers + this.haveToPay;

    // 3. Get the Project's total payable amount
    const project = await Project.findById(projectId, "amountPayableToMembers");
    if (!project) {
      return next(new Error(`Project not found with ID ${projectId}`));
    }

    // 4. Check the constraint
    if (newTotalPayable > project.amountPayableToMembers) {
      return next(
        new Error(
          `The total 'haveToPay' for all members (${newTotalPayable}) cannot exceed the Project's total payable amount (${project.amountPayableToMembers}).`
        )
      );
    }
  }

  next();
});

// 2. Post-Save Hook: Synchronizes Project totals after creation or update
projectMemberSchema.post("save", async function () {
  // Only trigger if a relevant paid field was modified
  if (this._amountPaidWasModified) {
    await this.constructor.calculateProjectPaidToMembers(this.project);
  }
});

// 3. Post-Delete Hook: Synchronizes Project totals after deletion
projectMemberSchema.post(
  "deleteOne",
  { document: true, query: false },
  async function () {
    await this.constructor.calculateProjectPaidToMembers(this.project);
  }
);

export default mongoose.model("ProjectMember", projectMemberSchema);

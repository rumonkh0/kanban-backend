import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    salutation: {
      type: String,
      enum: ["Mr", "Mrs", "Ms", "Dr", "Other"],
      default: "Mr",
    },
    category: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    name: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    mobile: {
      countryCode: { type: String, trim: true },
      number: { type: String, trim: true },
    },
    dob: { type: Date },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    loginAllowed: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },

    // Company info
    companyName: { type: String, trim: true },
    website: { type: String, trim: true },
    taxName: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    officePhone: { type: String, trim: true },

    // Address
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    address: { type: String, trim: true },
    shippingAddress: { type: String, trim: true },
    companyAddress: { type: String, trim: true },

    // Extras
    note: { type: String, trim: true },
    paymentMethods: [{ type: String, trim: true }],
    profilePicture: { type: String, default: null },
    companyLogo: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Client", clientSchema);

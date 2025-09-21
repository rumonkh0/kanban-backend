import mongoose from "mongoose";

const businessAddressSchema = new mongoose.Schema(
  {
    country: { type: String, default: "USA", trim: true },
    location: { type: String, trim: true }, // e.g., city or office location
    taxName: { type: String, trim: true },
    taxNumber: { type: String, trim: true },
    address: { type: String, trim: true }, // full address
    latitude: { type: Number }, // optional geo coordinates
    longitude: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model("BusinessAddress", businessAddressSchema);

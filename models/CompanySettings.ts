import mongoose, { Schema, models } from "mongoose";

const CompanySettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    name: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    engineer: { type: String, default: "", trim: true },
    contact: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default models.CompanySettings ||
  mongoose.model("CompanySettings", CompanySettingsSchema);

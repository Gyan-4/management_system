import mongoose, { Schema, models } from "mongoose";

const EquipmentUsageSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  equipmentName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true, min: 0 },
  ratePerHour: { type: Number, required: true, min: 0 },
  operator: { type: String, default: "", trim: true },
  notes: { type: String, default: "" },
}, { timestamps: true });

export default models.EquipmentUsage || mongoose.model("EquipmentUsage", EquipmentUsageSchema);

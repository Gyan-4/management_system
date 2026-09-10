import mongoose, { Schema, models } from "mongoose";

const MaterialPurchaseSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  date: { type: Date, required: true },
  material: { type: String, required: true, trim: true },
  supplier: { type: String, default: "", trim: true },
  unit: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  unitCost: { type: Number, required: true, min: 0 },
  reference: { type: String, default: "", trim: true },
}, { timestamps: true });

export default models.MaterialPurchase || mongoose.model("MaterialPurchase", MaterialPurchaseSchema);

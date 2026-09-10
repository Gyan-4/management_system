import mongoose, { Schema, models } from "mongoose";

const CostEntrySchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    category: { type: String, enum: ["Material", "Labor", "Equipment", "Expense"], required: true, index: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 0 },
    unit: { type: String, default: "lot", trim: true },
    unitCost: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    supplierOrEmployee: { type: String, default: "", trim: true },
    referenceNo: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

CostEntrySchema.index({ projectId: 1, category: 1, date: -1 });

export default models.CostEntry || mongoose.model("CostEntry", CostEntrySchema);

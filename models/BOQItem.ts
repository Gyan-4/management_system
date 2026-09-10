import mongoose, { Schema, models } from "mongoose";

const BOQItemSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    itemNo: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: ["Materials", "Labor", "Equipment", "Other"], required: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

BOQItemSchema.index({ projectId: 1, itemNo: 1 }, { unique: true });

export default models.BOQItem || mongoose.model("BOQItem", BOQItemSchema);

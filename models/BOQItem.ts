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
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

BOQItemSchema.virtual("totalCost").get(function () {
  return this.quantity * this.unitCost;
});

export default models.BOQItem || mongoose.model("BOQItem", BOQItemSchema);

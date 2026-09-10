import mongoose, { Schema, models } from "mongoose";

const ExpenseSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  date: { type: Date, required: true },
  category: { type: String, enum: ["Materials", "Labor", "Equipment", "Transportation", "Permits", "Utilities", "Other"], required: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, default: "", trim: true },
  notes: { type: String, default: "" },
}, { timestamps: true });

export default models.Expense || mongoose.model("Expense", ExpenseSchema);

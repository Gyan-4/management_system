import mongoose, { Schema, models } from "mongoose";

const LaborEntrySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  employeeName: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true, min: 0 },
  hourlyRate: { type: Number, required: true, min: 0 },
  notes: { type: String, default: "" },
}, { timestamps: true });

export default models.LaborEntry || mongoose.model("LaborEntry", LaborEntrySchema);

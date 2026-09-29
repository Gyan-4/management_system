import mongoose, { Schema, models } from "mongoose";

const WorkItemSchema = new Schema(
  {
    description: { type: String, required: true, trim: true },
    boqItemId: { type: Schema.Types.ObjectId, ref: "BOQItem", default: null },
    category: {
      type: String,
      enum: ["Material", "Labor", "Equipment", "Other"],
      default: "Material",
    },
    calculation: { type: String, default: "", trim: true },
    quantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: "", trim: true },
    unitCost: { type: Number, default: 0, min: 0 },
    actualCost: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const WorkSectionSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Existing", "Not Started", "In Progress", "Completed", "On Hold", "For Repair", "Skipped"],
      default: "Not Started",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    items: { type: [WorkItemSchema], default: [] },
  },
  { timestamps: true }
);

WorkSectionSchema.index({ projectId: 1, order: 1 });

export default models.WorkSection || mongoose.model("WorkSection", WorkSectionSchema);

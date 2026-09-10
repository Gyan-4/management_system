import mongoose, { Schema, models } from "mongoose";

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: String, required: true, trim: true },
    location: { type: String, default: "", trim: true },
    contractAmount: { type: Number, required: true, min: 0 },
    budget: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Planning", "Active", "On Hold", "Completed"],
      default: "Planning",
    },
    projectManager: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

export default models.Project || mongoose.model("Project", ProjectSchema);

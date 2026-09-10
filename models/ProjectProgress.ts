import mongoose, { Schema, models } from "mongoose";

const ProjectProgressSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    progressDate: { type: Date, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
    milestone: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

ProjectProgressSchema.index({ projectId: 1, progressDate: -1 });

export default models.ProjectProgress || mongoose.model("ProjectProgress", ProjectProgressSchema);

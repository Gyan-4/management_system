import mongoose, { Schema, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Project Manager", "Engineer"],
      default: "Project Manager",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.User || mongoose.model("User", UserSchema);

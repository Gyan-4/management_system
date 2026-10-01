import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import ProjectProgress from "@/models/ProjectProgress";
import WorkSection from "@/models/WorkSection";
import User from "@/models/User";

async function resolveManager(value: unknown) {
  const id = String(value || "").trim();
  if (!id) return { id: null, name: "" };
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error("Invalid project manager");
  const user = await User.findOne({ _id: id, role: { $in: ["Project Manager", "Admin"] }, active: true }).select("_id name").lean();
  if (!user) throw new Error("Selected project manager is not an active Project Manager or Admin");
  return { id: user._id, name: user.name };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    const body = await request.json();
    const contractAmount = Number(body.contractAmount);
    const budget = Number(body.budget);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const status = String(body.status || "Planning");
    const allowedStatuses = ["Planning", "Active", "On Hold", "Completed"];

    if (!body.name?.trim() || !body.client?.trim() || !body.startDate || !body.endDate) return NextResponse.json({ error: "Project name, client, start date, and end date are required" }, { status: 400 });
    if (!Number.isFinite(contractAmount) || contractAmount < 0 || !Number.isFinite(budget) || budget < 0) return NextResponse.json({ error: "Contract amount and budget must be valid non-negative numbers" }, { status: 400 });
    if (!allowedStatuses.includes(status)) return NextResponse.json({ error: "Status must be Planning, Active, On Hold, or Completed" }, { status: 400 });
    if (budget > contractAmount) return NextResponse.json({ error: "Budget cannot exceed the contract amount" }, { status: 400 });
    if (contractAmount === 0 && budget === 0) return NextResponse.json({ error: "Contract amount and budget cannot both be zero" }, { status: 400 });
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return NextResponse.json({ error: "Start and end dates must be valid" }, { status: 400 });
    if (endDate < startDate) return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });

    await connectDB();
    const manager = await resolveManager(body.projectManagerId);
    const project = await Project.findByIdAndUpdate(id, {
      name: body.name.trim(), client: body.client.trim(), location: body.location?.trim() || "",
      contractAmount, budget, startDate, endDate, status,
      projectManager: manager.name, projectManagerId: manager.id,
      description: body.description?.trim() || "",
    }, { new: true, runValidators: true }).lean();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update project" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    await connectDB();
    const project = await Project.findByIdAndDelete(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    await Promise.all([
      BOQItem.deleteMany({ projectId: id }),
      CostEntry.deleteMany({ projectId: id }),
      ProjectProgress.deleteMany({ projectId: id }),
      WorkSection.deleteMany({ projectId: id }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const body = await request.json();
    const update = {
      name: body.name,
      client: body.client,
      location: body.location,
      contractAmount: Number(body.contractAmount),
      budget: Number(body.budget),
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      projectManager: body.projectManager,
      description: body.description,
    };
    if (!update.name || !update.client || !update.startDate || !update.endDate || !Number.isFinite(update.contractAmount) || !Number.isFinite(update.budget)) {
      return NextResponse.json({ error: "Required project fields are missing" }, { status: 400 });
    }
    await connectDB();
    const project = await Project.findByIdAndUpdate(id, update, { new: true, runValidators: true }).lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json(project);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    await connectDB();
    const project = await Project.findByIdAndDelete(id);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 400 });
  }
}

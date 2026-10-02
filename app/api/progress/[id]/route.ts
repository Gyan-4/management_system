import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProjectProgress from "@/models/ProjectProgress";
import Project from "@/models/Project";
import { getSession, canAccessProject } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid progress ID" }, { status: 400 });

    const body = await request.json();
    const percentage = Number(body.percentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      return NextResponse.json({ error: "Progress must be between 0 and 100" }, { status: 400 });
    }

    const progressDate = new Date(body.progressDate);
    if (!body.progressDate || Number.isNaN(progressDate.getTime())) {
      return NextResponse.json({ error: "Progress date must be a valid date" }, { status: 400 });
    }

    await connectDB();
    const existing = await ProjectProgress.findById(id);
    if (!existing) return NextResponse.json({ error: "Progress record not found" }, { status: 404 });

    const projectId = body.projectId ? String(body.projectId) : String(existing.projectId);
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    }

    const project = await Project.findById(projectId).select("_id").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });

    existing.projectId = new mongoose.Types.ObjectId(projectId);
    existing.progressDate = progressDate;
    existing.percentage = percentage;
    existing.milestone = String(body.milestone || "").trim();
    existing.notes = String(body.notes || "").trim();

    await existing.save();
    return NextResponse.json(existing);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid progress ID" }, { status: 400 });
    await connectDB();
    const existing = await ProjectProgress.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    const project = await Project.findById(existing.projectId).select("_id").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    const result = await ProjectProgress.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Failed to delete progress" }, { status: 500 }); }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProjectProgress from "@/models/ProjectProgress";
import Project from "@/models/Project";
import { getSession, canAccessProject } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    await connectDB();
    const project = await Project.findById(projectId).select("_id projectManagerId").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, project.projectManagerId, session.id)) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    if (!canAccessProject(session.role, project.projectManagerId, session.id)) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    return NextResponse.json(await ProjectProgress.find({ projectId }).sort({ progressDate: -1, createdAt: -1 }).lean());
  } catch (error) { console.error(error); return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json();
    if (!body.projectId || !mongoose.Types.ObjectId.isValid(body.projectId) || !body.progressDate) return NextResponse.json({ error: "Project and progress date are required" }, { status: 400 });
    const percentage = Number(body.percentage);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) return NextResponse.json({ error: "Progress must be between 0 and 100" }, { status: 400 });
    const progressDate = new Date(body.progressDate);
    if (Number.isNaN(progressDate.getTime())) return NextResponse.json({ error: "Progress date must be a valid date" }, { status: 400 });

    await connectDB();
    const project = await Project.findById(body.projectId).select("_id projectManagerId").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const progress = await ProjectProgress.create({ projectId: body.projectId, progressDate, percentage, milestone: String(body.milestone || "").trim(), notes: String(body.notes || "").trim() });
    return NextResponse.json(progress, { status: 201 });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Failed to save progress" }, { status: 400 }); }
}

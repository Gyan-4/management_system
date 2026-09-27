import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";

type Context = { params: Promise<{ projectId: string }> };

const DEFAULT_SECTIONS = [
  "Foundation",
  "Structural Frame",
  "Walls",
  "Roof",
  "Doors & Windows",
  "Electrical",
  "Plumbing",
  "Finishes",
];

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { projectId } = await params;
    await connectDB();
    const sections = await WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean();
    return NextResponse.json(sections);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch work sections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    await connectDB();

    const project = await Project.findById(projectId).lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const existingCount = await WorkSection.countDocuments({ projectId });
    const names = existingCount === 0 && body.useDefaultTemplate !== false
      ? DEFAULT_SECTIONS
      : [String(body.name || "").trim()];

    if (names.length === 1 && !names[0]) {
      return NextResponse.json({ error: "Work section name is required." }, { status: 400 });
    }

    const created = await WorkSection.insertMany(
      names.map((name, index) => ({
        projectId,
        name,
        order: existingCount + index,
        status: "Not Started",
        progress: 0,
        items: [],
      }))
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create work section" }, { status: 400 });
  }
}

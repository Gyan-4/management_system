import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";

export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await connectDB();
    const project = await Project.create({
      name: body.name,
      client: body.client,
      location: body.location,
      contractAmount: Number(body.contractAmount),
      budget: Number(body.budget),
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status || "Planning",
      projectManager: body.projectManager,
      description: body.description,
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 400 });
  }
}

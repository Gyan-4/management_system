import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import ProjectProgress from "@/models/ProjectProgress";

export async function GET() {
  try {
    await connectDB();
    const projects = await Project.find().sort({ createdAt: -1 }).lean();
    const progress = await ProjectProgress.find({ projectId: { $in: projects.map((p) => p._id) } }).sort({ progressDate: -1 }).lean();
    const latestByProject = new Map<string, number>();
    for (const record of progress) {
      const key = String(record.projectId);
      if (!latestByProject.has(key)) latestByProject.set(key, Number(record.percentage) || 0);
    }
    return NextResponse.json(projects.map((project) => ({
      ...project,
      physicalProgress: latestByProject.get(String(project._id)) ?? 0,
    })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    const client = String(body.client || "").trim();
    const contractAmount = Number(body.contractAmount);
    const budget = Number(body.budget);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const status = String(body.status || "Planning");
    const allowedStatuses = ["Planning", "Active", "On Hold", "Completed"];

    if (!name || !client || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Project name, client, start date, and end date are required" }, { status: 400 });
    }
    if (!Number.isFinite(contractAmount) || contractAmount < 0 || !Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ error: "Contract amount and budget must be valid non-negative numbers" }, { status: 400 });
    }
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Status must be Planning, Active, On Hold, or Completed" }, { status: 400 });
    }
    if (budget > contractAmount) {
      return NextResponse.json({ error: "Budget cannot exceed the contract amount" }, { status: 400 });
    }
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Start and end dates must be valid" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date cannot be earlier than start date" }, { status: 400 });
    }

    await connectDB();
    const project = await Project.create({
      name,
      client,
      location: String(body.location || "").trim(),
      contractAmount,
      budget,
      startDate,
      endDate,
      status,
      projectManager: String(body.projectManager || "").trim(),
      description: String(body.description || "").trim(),
    });
    const defaultSections = [
      "Foundation",
      "Structural Frame",
      "Walls",
      "Roof",
      "Doors & Windows",
      "Electrical",
      "Plumbing",
      "Finishes",
    ];
    await WorkSection.insertMany(defaultSections.map((name, index) => ({
      projectId: project._id,
      name,
      order: index,
      status: "Not Started",
      progress: 0,
      items: [],
    })));

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";

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
    const name = String(body.name || "").trim();
    const client = String(body.client || "").trim();
    const contractAmount = Number(body.contractAmount);
    const budget = Number(body.budget);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (!name || !client || !body.startDate || !body.endDate) {
      return NextResponse.json({ error: "Project name, client, start date, and end date are required" }, { status: 400 });
    }
    if (!Number.isFinite(contractAmount) || contractAmount < 0 || !Number.isFinite(budget) || budget < 0) {
      return NextResponse.json({ error: "Contract amount and budget must be valid non-negative numbers" }, { status: 400 });
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
      status: body.status || "Planning",
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

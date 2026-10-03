import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import { getSession, canAccessProject } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const projectId = request.nextUrl.searchParams.get("projectId");
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const filter: Record<string, unknown> = projectId ? { projectId } : {};
    if (projectId) {
      const project = await Project.findById(projectId).select("_id").lean();
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
      if (!canAccessProject(session.role, null, session.id)) {
        return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
      }
    }

    const items = await BOQItem.find(filter).sort({ itemNo: 1 }).lean();
    if (!items.length) return NextResponse.json([]);

    const itemIds = items.map((item) => item._id);
    const actuals = await CostEntry.aggregate([
      { $match: { boqItemId: { $in: itemIds } } },
      {
        $group: {
          _id: "$boqItemId",
          actualQuantity: { $sum: "$quantity" },
          actualCost: { $sum: "$amount" },
        },
      },
    ]);

    const actualMap = new Map(
      actuals.map((entry) => [
        String(entry._id),
        {
          actualQuantity: Number(entry.actualQuantity || 0),
          actualCost: Number(entry.actualCost || 0),
        },
      ])
    );

    const sectionIds = items.map((item) => item.workSectionId).filter(Boolean);
    const sections = sectionIds.length
      ? await WorkSection.find({ _id: { $in: sectionIds } }).select("_id name").lean()
      : [];
    const sectionMap = new Map(sections.map((section) => [String(section._id), section.name]));

    return NextResponse.json(
      items.map((item) => {
        const actual = actualMap.get(String(item._id)) || { actualQuantity: 0, actualCost: 0 };
        const plannedQuantity = Number(item.quantity || 0);
        const plannedCost = Number(item.totalCost ?? plannedQuantity * Number(item.unitCost || 0));
        return {
          ...item,
          workSectionName: item.workSectionId ? sectionMap.get(String(item.workSectionId)) || "" : "",
          actualQuantity: actual.actualQuantity,
          actualCost: actual.actualCost,
          quantityVariance: plannedQuantity - actual.actualQuantity,
          costVariance: plannedCost - actual.actualCost,
        };
      })
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch BOQ items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const projectId = String(body.projectId || "").trim();
    const itemNo = String(body.itemNo || "").trim();
    const description = String(body.description || "").trim();
    const unit = String(body.unit || "").trim();

    if (!projectId || !itemNo || !description || !body.category || !unit) {
      return NextResponse.json({ error: "Project, item number, description, category, and unit are required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    await connectDB();
    const project = await Project.findById(projectId).select("budget").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }

    let workSectionId: string | null = null;
    if (body.workSectionId) {
      if (!mongoose.Types.ObjectId.isValid(body.workSectionId)) {
        return NextResponse.json({ error: "Invalid work section" }, { status: 400 });
      }
      const section = await WorkSection.findOne({ _id: body.workSectionId, projectId }).select("_id").lean();
      if (!section) return NextResponse.json({ error: "Work section does not belong to this project" }, { status: 400 });
      workSectionId = body.workSectionId;
    }

    const quantity = Number(body.quantity);
    const unitCost = Number(body.unitCost);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json({ error: "Quantity and unit cost must be valid non-negative numbers" }, { status: 400 });
    }

    const existingBOQ = await BOQItem.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]);
    const currentTotal = Number(existingBOQ[0]?.total || 0);
    const newTotal = currentTotal + quantity * unitCost;
    if (newTotal > Number(project.budget)) {
      return NextResponse.json({ error: `BOQ total would exceed the project budget by ${newTotal - Number(project.budget)}.` }, { status: 409 });
    }

    const item = await BOQItem.create({
      projectId,
      workSectionId,
      itemNo,
      description,
      category: body.category,
      unit,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      notes: body.notes || "",
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    console.error(error);
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "That item number already exists in this project" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create BOQ item" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import WorkSection from "@/models/WorkSection";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid BOQ item id" }, { status: 400 });
    }

    const body = await request.json();
    const quantity = Number(body.quantity);
    const unitCost = Number(body.unitCost);

    if (!body.itemNo?.trim() || !body.description?.trim() || !body.category || !body.unit?.trim()) {
      return NextResponse.json({ error: "Item number, description, category, and unit are required" }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json({ error: "Quantity and unit cost must be valid non-negative numbers" }, { status: 400 });
    }

    await connectDB();

    const existing = await BOQItem.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "BOQ item not found" }, { status: 404 });

    const linkedActualCost = await CostEntry.aggregate([
      { $match: { boqItemId: existing._id } },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]);
    const actualCost = Number(linkedActualCost[0]?.amount || 0);
    const newPlannedCost = quantity * unitCost;

    const project = await (await import("@/models/Project")).default.findById(existing.projectId).select("budget").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const currentProjectBOQ = await BOQItem.aggregate([
      { $match: { projectId: existing.projectId, _id: { $ne: existing._id } } },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]);
    const projectedBOQTotal = Number(currentProjectBOQ[0]?.total || 0) + newPlannedCost;
    if (projectedBOQTotal > Number(project.budget)) {
      return NextResponse.json(
        { error: `Updated BOQ total would exceed the project budget by ${projectedBOQTotal - Number(project.budget)}.` },
        { status: 409 }
      );
    }

    if (actualCost > newPlannedCost) {
      return NextResponse.json(
        { error: `Planned BOQ cost cannot be reduced below recorded actual cost of ${actualCost}.` },
        { status: 409 }
      );
    }

    const item = await BOQItem.findByIdAndUpdate(
      id,
      {
        itemNo: body.itemNo.trim(),
        description: body.description.trim(),
        category: body.category,
        unit: body.unit.trim(),
        quantity,
        unitCost,
        totalCost: quantity * unitCost,
        notes: body.notes || "",
      },
      { new: true, runValidators: true }
    ).lean();

    if (!item) return NextResponse.json({ error: "BOQ item not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: unknown) {
    console.error(error);
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "That item number already exists in this project" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update BOQ item" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid BOQ item id" }, { status: 400 });
    }
    await connectDB();
    const [costReference, sectionReference] = await Promise.all([
      CostEntry.exists({ boqItemId: id }),
      WorkSection.exists({ "items.boqItemId": id }),
    ]);

    if (costReference || sectionReference) {
      return NextResponse.json(
        { error: "This BOQ item is linked to recorded costs or a work section. Remove those links before deleting it." },
        { status: 409 }
      );
    }

    const result = await BOQItem.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete BOQ item" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }
    const items = await BOQItem.find(projectId ? { projectId } : {}).sort({ itemNo: 1 }).lean();
    return NextResponse.json(items);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch BOQ items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const itemNo = String(body.itemNo || "").trim();
    const description = String(body.description || "").trim();
    const unit = String(body.unit || "").trim();

    if (!body.projectId || !itemNo || !description || !body.category || !unit) {
      return NextResponse.json({ error: "Project, item number, description, category, and unit are required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(body.projectId)) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const quantity = Number(body.quantity);
    const unitCost = Number(body.unitCost);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      return NextResponse.json({ error: "Quantity and unit cost must be valid non-negative numbers" }, { status: 400 });
    }

    await connectDB();
    const item = await BOQItem.create({
      projectId: body.projectId,
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

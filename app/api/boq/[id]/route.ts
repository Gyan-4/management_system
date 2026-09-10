import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";

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
    const result = await BOQItem.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete BOQ item" }, { status: 500 });
  }
}

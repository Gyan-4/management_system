import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CostEntry from "@/models/CostEntry";

const categories = ["Material", "Labor", "Equipment", "Expense"] as const;

function validNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    const body = await request.json();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const unit = String(body.unit || "lot").trim();
    const date = String(body.date || "").trim();

    if (!category || !description || !unit || !date) return NextResponse.json({ error: "Category, description, unit, and date are required" }, { status: 400 });
    if (!categories.includes(category as (typeof categories)[number])) return NextResponse.json({ error: "Invalid cost category" }, { status: 400 });

    const quantity = validNumber(body.quantity, 0);
    const unitCost = validNumber(body.unitCost, 0);
    const enteredAmount = validNumber(body.amount, 0);
    if (quantity < 0 || unitCost < 0 || enteredAmount < 0) return NextResponse.json({ error: "Cost values must be non-negative numbers" }, { status: 400 });

    const amount = category === "Expense" ? enteredAmount : quantity * unitCost;
    await connectDB();
    const entry = await CostEntry.findByIdAndUpdate(id, {
      category,
      description,
      quantity,
      unit,
      unitCost,
      amount,
      date,
      supplierOrEmployee: String(body.supplierOrEmployee || "").trim(),
      referenceNo: String(body.referenceNo || "").trim(),
      notes: String(body.notes || "").trim(),
    }, { new: true, runValidators: true }).lean();

    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json(entry);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update cost entry" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });
    await connectDB();
    const result = await CostEntry.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete cost entry" }, { status: 500 });
  }
}

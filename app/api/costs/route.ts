import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CostEntry from "@/models/CostEntry";

const categories = ["Material", "Labor", "Equipment", "Expense"] as const;

function validNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const projectId = request.nextUrl.searchParams.get("projectId");
    const category = request.nextUrl.searchParams.get("category");
    const filter: Record<string, unknown> = {};

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
      filter.projectId = projectId;
    }
    if (category) {
      if (!categories.includes(category as (typeof categories)[number])) return NextResponse.json({ error: "Invalid cost category" }, { status: 400 });
      filter.category = category;
    }

    const entries = await CostEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    return NextResponse.json(entries);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch cost entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const projectId = String(body.projectId || "").trim();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const unit = String(body.unit || "lot").trim();
    const date = String(body.date || "").trim();

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId) || !category || !description || !date) {
      return NextResponse.json({ error: "Project, category, description, and date are required" }, { status: 400 });
    }
    if (!categories.includes(category as (typeof categories)[number])) return NextResponse.json({ error: "Invalid cost category" }, { status: 400 });
    if (!unit) return NextResponse.json({ error: "Unit cannot be empty" }, { status: 400 });

    const quantity = validNumber(body.quantity, 0);
    const unitCost = validNumber(body.unitCost, 0);
    const enteredAmount = validNumber(body.amount, 0);
    if (quantity < 0 || unitCost < 0 || enteredAmount < 0) return NextResponse.json({ error: "Cost values must be non-negative numbers" }, { status: 400 });

    const amount = category === "Expense" ? enteredAmount : quantity * unitCost;
    if (!Number.isFinite(amount)) return NextResponse.json({ error: "Calculated amount is invalid" }, { status: 400 });

    await connectDB();
    const entry = await CostEntry.create({
      projectId,
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
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create cost entry" }, { status: 400 });
  }
}

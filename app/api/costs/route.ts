import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CostEntry from "@/models/CostEntry";

const categories = ["Material", "Labor", "Equipment", "Expense"] as const;

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
    if (category && categories.includes(category as (typeof categories)[number])) filter.category = category;
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
    if (!body.projectId || !mongoose.Types.ObjectId.isValid(body.projectId) || !body.category || !body.description || !body.date) {
      return NextResponse.json({ error: "Project, category, description, and date are required" }, { status: 400 });
    }
    if (!categories.includes(body.category)) return NextResponse.json({ error: "Invalid cost category" }, { status: 400 });
    await connectDB();
    const quantity = Math.max(0, Number(body.quantity) || 0);
    const unitCost = Math.max(0, Number(body.unitCost) || 0);
    const amount = body.category === "Expense" ? Math.max(0, Number(body.amount) || 0) : quantity * unitCost;
    const entry = await CostEntry.create({
      projectId: body.projectId,
      category: body.category,
      description: body.description,
      quantity,
      unit: body.unit || "lot",
      unitCost,
      amount,
      date: body.date,
      supplierOrEmployee: body.supplierOrEmployee || "",
      referenceNo: body.referenceNo || "",
      notes: body.notes || "",
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create cost entry" }, { status: 400 });
  }
}

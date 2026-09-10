import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const projectId = request.nextUrl.searchParams.get("projectId");
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
    if (!body.projectId || !body.description || !body.category || !body.unit) {
      return NextResponse.json({ error: "Project, description, category, and unit are required" }, { status: 400 });
    }
    await connectDB();
    const item = await BOQItem.create({
      projectId: body.projectId,
      itemNo: body.itemNo || "1",
      description: body.description,
      category: body.category,
      unit: body.unit,
      quantity: Number(body.quantity) || 0,
      unitCost: Number(body.unitCost) || 0,
      notes: body.notes || "",
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create BOQ item" }, { status: 400 });
  }
}

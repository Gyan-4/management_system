import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    await connectDB();
    const [project, boq, actual] = await Promise.all([
      Project.findById(projectId).lean(),
      BOQItem.find({ projectId }).lean(),
      CostEntry.find({ projectId }).lean(),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const estimate = { Materials: 0, Labor: 0, Equipment: 0, Other: 0 };
    boq.forEach(item => { estimate[item.category as keyof typeof estimate] += item.quantity * item.unitCost; });
    const spent = { Material: 0, Labor: 0, Equipment: 0, Expense: 0 };
    actual.forEach(item => { spent[item.category as keyof typeof spent] += item.amount; });
    const estimatedTotal = Object.values(estimate).reduce((a, b) => a + b, 0);
    const actualTotal = Object.values(spent).reduce((a, b) => a + b, 0);
    return NextResponse.json({ project, estimate, spent, estimatedTotal, actualTotal, variance: estimatedTotal - actualTotal, budgetRemaining: project.budget - actualTotal, projectedProfit: project.contractAmount - actualTotal, boqCount: boq.length, entryCount: actual.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}

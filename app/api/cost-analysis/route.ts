import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";

type WorkItem = { category: "Material" | "Labor" | "Equipment" | "Other"; quantity?: number; unitCost?: number; actualCost?: number };
type WorkSectionRow = { _id: unknown; name: string; status: string; progress: number; items: WorkItem[] };
const finite = (value: unknown, fallback = 0) => { const number = Number(value); return Number.isFinite(number) ? number : fallback; };

function calculateProjectCompletion(sections: WorkSectionRow[]) {
  if (!sections.length) return 0;
  let estimated = 0;
  let weighted = 0;
  for (const section of sections) {
    const sectionEstimate = section.items.reduce((sum, item) => sum + Math.max(0, finite(item.quantity)) * Math.max(0, finite(item.unitCost)), 0);
    const progress = Math.min(100, Math.max(0, finite(section.progress)));
    estimated += sectionEstimate;
    weighted += sectionEstimate * progress;
  }
  if (estimated > 0) return Math.min(100, Math.max(0, weighted / estimated));
  return Math.min(100, Math.max(0, sections.reduce((sum, section) => sum + Math.min(100, Math.max(0, finite(section.progress))), 0) / sections.length));
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    await connectDB();

    const [project, boq, actual, sections] = await Promise.all([
      Project.findById(projectId).lean(),
      BOQItem.find({ projectId }).lean(),
      CostEntry.find({ projectId }).lean(),
      WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean(),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const sectionRows = sections as unknown as WorkSectionRow[];
    const actualBySection = new Map<string, number>();
    actual.forEach((entry) => {
      if (entry.workSectionId) {
        const key = String(entry.workSectionId);
        actualBySection.set(key, (actualBySection.get(key) || 0) + finite(entry.amount));
      }
    });

    const sectionBreakdown = sectionRows.map((section) => {
      const estimated = section.items.reduce((sum, item) => sum + finite(item.quantity) * finite(item.unitCost), 0);
      const manualActual = section.items.reduce((sum, item) => sum + finite(item.actualCost), 0);
      const linkedActual = actualBySection.get(String(section._id));
      const actualCost = linkedActual !== undefined ? linkedActual : manualActual;
      const progress = Math.min(100, Math.max(0, finite(section.progress)));
      return { id: String(section._id), name: section.name, status: section.status, progress, estimated, actual: actualCost, remaining: estimated - actualCost };
    });

    const sectionActualTotal = sectionBreakdown.reduce((sum, section) => sum + section.actual, 0);
    const estimate = { Materials: 0, Labor: 0, Equipment: 0, Other: 0 };
    boq.forEach((item) => { const category = item.category as keyof typeof estimate; if (category in estimate) estimate[category] += finite(item.quantity) * finite(item.unitCost); });

    const spent = { Material: 0, Labor: 0, Equipment: 0, Expense: 0 };
    const actualByBOQ = new Map<string, { quantity: number; amount: number }>();
    actual.forEach((item) => {
      const category = item.category as keyof typeof spent;
      if (category in spent) spent[category] += finite(item.amount);
      if (item.boqItemId) {
        const key = String(item.boqItemId);
        const current = actualByBOQ.get(key) || { quantity: 0, amount: 0 };
        current.quantity += finite(item.quantity);
        current.amount += finite(item.amount);
        actualByBOQ.set(key, current);
      }
    });

    const estimatedTotal = Object.values(estimate).reduce((a, b) => a + b, 0);
    const costEntryActualTotal = Object.values(spent).reduce((a, b) => a + b, 0);
    const actualTotal = costEntryActualTotal > 0 ? costEntryActualTotal : sectionActualTotal;
    const physicalProgress = calculateProjectCompletion(sectionRows);
    const contractAmount = Math.max(0, finite(project.contractAmount));
    const budget = Math.max(0, finite(project.budget));
    const financialProgress = contractAmount > 0 ? (actualTotal / contractAmount) * 100 : 0;
    const budgetUtilization = budget > 0 ? (actualTotal / budget) * 100 : 0;
    const boqUtilization = estimatedTotal > 0 ? (actualTotal / estimatedTotal) * 100 : 0;
    const progressGap = financialProgress - physicalProgress;

    const boqLineAnalysis = boq.map((item) => {
      const actualLine = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
      const plannedQuantity = Math.max(0, finite(item.quantity));
      const plannedCost = Math.max(0, finite(item.totalCost ?? plannedQuantity * finite(item.unitCost)));
      const actualQuantity = actualLine.quantity;
      const actualCost = actualLine.amount;
      return { id: String(item._id), itemNo: item.itemNo, description: item.description, category: item.category, unit: item.unit, plannedQuantity, actualQuantity, quantityVariance: plannedQuantity - actualQuantity, plannedCost, actualCost, costVariance: plannedCost - actualCost, utilization: plannedQuantity > 0 ? (actualQuantity / plannedQuantity) * 100 : 0 };
    });

    return NextResponse.json({
      project, estimate, spent, estimatedTotal, actualTotal, variance: estimatedTotal - actualTotal, budgetRemaining: budget - actualTotal, projectedProfit: contractAmount - actualTotal,
      physicalProgress, financialProgress, budgetUtilization, boqUtilization, progressGap,
      progressStatus: progressGap > 10 ? "Spending ahead of physical progress" : progressGap < -10 ? "Physical progress ahead of spending" : "Progress and spending are aligned",
      latestProgressDate: null, boqCount: boq.length, entryCount: actual.length, workSectionCount: sectionRows.length, sectionBreakdown, boqLineAnalysis, estimateSource: "BOQ",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}

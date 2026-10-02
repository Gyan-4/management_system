import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import ProjectProgress from "@/models/ProjectProgress";
import { getSession, canAccessProject } from "@/lib/session";

const finite = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function boqPhysicalProgress(
  boq: Array<{ _id: unknown; quantity?: unknown; unitCost?: unknown; totalCost?: unknown }>,
  actualByBOQ: Map<string, { quantity: number; amount: number }>
) {
  let planned = 0;
  let weighted = 0;
  for (const item of boq) {
    const qty = Math.max(0, finite(item.quantity));
    const cost = Math.max(0, finite(item.totalCost ?? qty * finite(item.unitCost)));
    const actual = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
    const completion = qty > 0 ? Math.min(1, Math.max(0, actual.quantity / qty)) : cost > 0 ? Math.min(1, Math.max(0, actual.amount / cost)) : 0;
    planned += cost;
    weighted += cost * completion;
  }
  return planned > 0 ? Math.min(100, Math.max(0, (weighted / planned) * 100)) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });

    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const [project, boq, actual, sections, latestProgress] = await Promise.all([
      Project.findById(projectId).lean(),
      BOQItem.find({ projectId }).lean(),
      CostEntry.find({ projectId }).lean(),
      WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean(),
      ProjectProgress.findOne({ projectId }).sort({ progressDate: -1, createdAt: -1 }).lean(),
    ]);
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });

    const estimate = { Materials: 0, Labor: 0, Equipment: 0, Other: 0 };
    boq.forEach(item => {
      const category = item.category as keyof typeof estimate;
      if (category in estimate) estimate[category] += Math.max(0, finite(item.totalCost ?? finite(item.quantity) * finite(item.unitCost)));
    });

    const spent = { Material: 0, Labor: 0, Equipment: 0, Expense: 0 };
    const actualByBOQ = new Map<string, { quantity: number; amount: number }>();
    const directActualBySection = new Map<string, number>();

    actual.forEach(entry => {
      const category = entry.category as keyof typeof spent;
      if (category in spent) spent[category] += finite(entry.amount);

      if (entry.boqItemId) {
        const key = String(entry.boqItemId);
        const current = actualByBOQ.get(key) || { quantity: 0, amount: 0 };
        current.quantity += finite(entry.quantity);
        current.amount += finite(entry.amount);
        actualByBOQ.set(key, current);
      } else if (entry.workSectionId) {
        const key = String(entry.workSectionId);
        directActualBySection.set(key, (directActualBySection.get(key) || 0) + finite(entry.amount));
      }
    });

    const estimatedTotal = Object.values(estimate).reduce((a, b) => a + b, 0);
    const actualTotal = actual.reduce((sum, entry) => sum + finite(entry.amount), 0);
    const contractAmount = Math.max(0, finite(project.contractAmount));
    const budget = Math.max(0, finite(project.budget));
    const physicalProgress = boqPhysicalProgress(boq, actualByBOQ);
    const financialProgress = contractAmount > 0 ? (actualTotal / contractAmount) * 100 : 0;
    const budgetUtilization = budget > 0 ? (actualTotal / budget) * 100 : 0;
    const boqUtilization = estimatedTotal > 0 ? (actualTotal / estimatedTotal) * 100 : 0;
    const progressGap = financialProgress - physicalProgress;

    const sectionBreakdown = sections.map(section => {
      const sectionBOQ = boq.filter(item => String(item.workSectionId || "") === String(section._id));
      const estimated = sectionBOQ.reduce((sum, item) => sum + Math.max(0, finite(item.totalCost ?? finite(item.quantity) * finite(item.unitCost))), 0);
      const boqActual = sectionBOQ.reduce((sum, item) => sum + (actualByBOQ.get(String(item._id))?.amount || 0), 0);
      const actualCost = boqActual + (directActualBySection.get(String(section._id)) || 0);
      let weighted = 0;
      sectionBOQ.forEach(item => {
        const qty = Math.max(0, finite(item.quantity));
        const cost = Math.max(0, finite(item.totalCost ?? qty * finite(item.unitCost)));
        const actualLine = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
        const completion = qty > 0 ? Math.min(1, Math.max(0, actualLine.quantity / qty)) : cost > 0 ? Math.min(1, Math.max(0, actualLine.amount / cost)) : 0;
        weighted += cost * completion;
      });
      return { id: String(section._id), name: section.name, status: section.status, progress: estimated > 0 ? (weighted / estimated) * 100 : 0, estimated, actual: actualCost, remaining: estimated - actualCost };
    });

    const boqLineAnalysis = boq.map(item => {
      const actualLine = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
      const plannedQuantity = Math.max(0, finite(item.quantity));
      const plannedCost = Math.max(0, finite(item.totalCost ?? plannedQuantity * finite(item.unitCost)));
      return {
        id: String(item._id),
        itemNo: item.itemNo,
        description: item.description,
        category: item.category,
        unit: item.unit,
        plannedQuantity,
        actualQuantity: actualLine.quantity,
        quantityVariance: plannedQuantity - actualLine.quantity,
        plannedCost,
        actualCost: actualLine.amount,
        costVariance: plannedCost - actualLine.amount,
        utilization: plannedQuantity > 0 ? (actualLine.quantity / plannedQuantity) * 100 : 0,
      };
    });

    return NextResponse.json({
      project,
      estimate,
      spent,
      estimatedTotal,
      actualTotal,
      variance: estimatedTotal - actualTotal,
      budgetRemaining: budget - actualTotal,
      projectedProfit: contractAmount - actualTotal,
      physicalProgress,
      financialProgress,
      budgetUtilization,
      boqUtilization,
      progressGap,
      progressStatus: progressGap > 10 ? "Spending ahead of physical progress" : progressGap < -10 ? "Physical progress ahead of spending" : "Progress and spending are aligned",
      latestProgressDate: latestProgress?.progressDate ? new Date(latestProgress.progressDate).toISOString() : null,
      boqCount: boq.length,
      entryCount: actual.length,
      workSectionCount: sections.length,
      sectionBreakdown,
      boqLineAnalysis,
      estimateSource: "BOQ",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}

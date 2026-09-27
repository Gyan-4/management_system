import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";
import ProjectProgress from "@/models/ProjectProgress";
import WorkSection from "@/models/WorkSection";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    }

    await connectDB();

    const [project, boq, actual, progress, sections] = await Promise.all([
      Project.findById(projectId).lean(),
      BOQItem.find({ projectId }).lean(),
      CostEntry.find({ projectId }).lean(),
      ProjectProgress.findOne({ projectId }).sort({ progressDate: -1, createdAt: -1 }).lean(),
      WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean(),
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const sectionBreakdown = sections.map((section) => {
      const estimated = section.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
      const actualCost = section.items.reduce((sum, item) => sum + Number(item.actualCost || 0), 0);
      return {
        id: String(section._id),
        name: section.name,
        status: section.status,
        progress: Number(section.progress || 0),
        estimated,
        actual: actualCost,
        remaining: estimated - actualCost,
      };
    });

    const sectionEstimatedTotal = sectionBreakdown.reduce((sum, section) => sum + section.estimated, 0);
    const sectionActualTotal = sectionBreakdown.reduce((sum, section) => sum + section.actual, 0);

    const estimate = { Materials: 0, Labor: 0, Equipment: 0, Other: 0 };
    boq.forEach((item) => {
      estimate[item.category as keyof typeof estimate] += item.quantity * item.unitCost;
    });

    if (sectionEstimatedTotal > 0) {
      Object.keys(estimate).forEach((key) => { estimate[key as keyof typeof estimate] = 0; });
      sections.forEach((section) => section.items.forEach((item) => {
        const category = item.category === "Material" ? "Materials" : item.category;
        estimate[category as keyof typeof estimate] += Number(item.quantity || 0) * Number(item.unitCost || 0);
      }));
    }

    const spent = { Material: 0, Labor: 0, Equipment: 0, Expense: 0 };
    actual.forEach((item) => {
      spent[item.category as keyof typeof spent] += item.amount;
    });

    const estimatedTotal = Object.values(estimate).reduce((a, b) => a + b, 0);
    const costEntryActualTotal = Object.values(spent).reduce((a, b) => a + b, 0);
    const actualTotal = sectionActualTotal > 0 ? sectionActualTotal : costEntryActualTotal;
    const physicalProgress = progress?.percentage ?? 0;
    const financialProgress = project.contractAmount > 0 ? (actualTotal / project.contractAmount) * 100 : 0;
    const budgetUtilization = project.budget > 0 ? (actualTotal / project.budget) * 100 : 0;
    const progressGap = financialProgress - physicalProgress;

    return NextResponse.json({
      project,
      estimate,
      spent,
      estimatedTotal,
      actualTotal,
      variance: estimatedTotal - actualTotal,
      budgetRemaining: project.budget - actualTotal,
      projectedProfit: project.contractAmount - actualTotal,
      physicalProgress,
      financialProgress,
      budgetUtilization,
      progressGap,
      progressStatus:
        progressGap > 10
          ? "Spending ahead of physical progress"
          : progressGap < -10
            ? "Physical progress ahead of spending"
            : "Progress and spending are aligned",
      latestProgressDate: progress?.progressDate ?? null,
      boqCount: boq.length,
      entryCount: actual.length,
      workSectionCount: sections.length,
      sectionBreakdown,
      estimateSource: sectionEstimatedTotal > 0 ? "Work Section Breakdown" : "BOQ",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}

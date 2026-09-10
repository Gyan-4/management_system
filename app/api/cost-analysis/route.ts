import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import Project from "@/models/Project";
import ProjectProgress from "@/models/ProjectProgress";

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid projectId is required" }, { status: 400 });
    }

    await connectDB();

    const [project, boq, actual, progress] = await Promise.all([
      Project.findById(projectId).lean(),
      BOQItem.find({ projectId }).lean(),
      CostEntry.find({ projectId }).lean(),
      ProjectProgress.findOne({ projectId }).sort({ progressDate: -1, createdAt: -1 }).lean(),
    ]);

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const estimate = { Materials: 0, Labor: 0, Equipment: 0, Other: 0 };
    boq.forEach((item) => {
      estimate[item.category as keyof typeof estimate] += item.quantity * item.unitCost;
    });

    const spent = { Material: 0, Labor: 0, Equipment: 0, Expense: 0 };
    actual.forEach((item) => {
      spent[item.category as keyof typeof spent] += item.amount;
    });

    const estimatedTotal = Object.values(estimate).reduce((a, b) => a + b, 0);
    const actualTotal = Object.values(spent).reduce((a, b) => a + b, 0);
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
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate cost analysis" }, { status: 500 });
  }
}

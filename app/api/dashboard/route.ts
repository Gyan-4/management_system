import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";

export async function GET() {
  try {
    await connectDB();
    const [projects, boq, costs] = await Promise.all([
      Project.find().lean(),
      BOQItem.find().lean(),
      CostEntry.find().lean(),
    ]);

    const projectRows = projects.map((project) => {
      const id = String(project._id);
      const projectBoq = boq.filter((item) => String(item.projectId) === id);
      const projectCosts = costs.filter((entry) => String(entry.projectId) === id);

      const boqTotal = projectBoq.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0),
        0,
      );
      const actualCost = projectCosts.reduce(
        (sum, entry) => sum + Number(entry.amount || 0),
        0,
      );

      const budget = Number(project.budget || 0);
      const contractAmount = Number(project.contractAmount || 0);

      return {
        _id: project._id,
        name: project.name,
        client: project.client,
        status: project.status,
        budget,
        contractAmount,
        boqTotal,
        actualCost,
        remainingBudget: budget - actualCost,
        variance: boqTotal - actualCost,
        projectedProfit: contractAmount - actualCost,
        budgetUtilization: budget > 0 ? (actualCost / budget) * 100 : 0,
      };
    });

    return NextResponse.json({
      projects: projectRows,
      totals: {
        contract: projectRows.reduce((sum, project) => sum + project.contractAmount, 0),
        budget: projectRows.reduce((sum, project) => sum + project.budget, 0),
        actual: projectRows.reduce((sum, project) => sum + project.actualCost, 0),
        boq: projectRows.reduce((sum, project) => sum + project.boqTotal, 0),
        remainingBudget: projectRows.reduce((sum, project) => sum + project.remainingBudget, 0),
        projectedProfit: projectRows.reduce((sum, project) => sum + project.projectedProfit, 0),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

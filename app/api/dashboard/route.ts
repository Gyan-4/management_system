import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import { getSession } from "@/lib/session";

const finite = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function physicalProgress(
  boq: Array<{ _id: unknown; quantity?: unknown; unitCost?: unknown; totalCost?: unknown }>,
  costs: Array<{ boqItemId?: unknown; quantity?: unknown; amount?: unknown }>
) {
  const actualByBOQ = new Map<string, { quantity: number; amount: number }>();
  costs.forEach(entry => {
    if (!entry.boqItemId) return;
    const key = String(entry.boqItemId);
    const current = actualByBOQ.get(key) || { quantity: 0, amount: 0 };
    current.quantity += finite(entry.quantity);
    current.amount += finite(entry.amount);
    actualByBOQ.set(key, current);
  });

  let planned = 0;
  let weighted = 0;
  boq.forEach(item => {
    const quantity = Math.max(0, finite(item.quantity));
    const cost = Math.max(0, finite(item.totalCost ?? quantity * finite(item.unitCost)));
    const actual = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
    const completion = quantity > 0 ? Math.min(1, Math.max(0, actual.quantity / quantity)) : cost > 0 ? Math.min(1, Math.max(0, actual.amount / cost)) : 0;
    planned += cost;
    weighted += cost * completion;
  });
  return planned > 0 ? Math.min(100, Math.max(0, (weighted / planned) * 100)) : 0;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const [projects, boq, costs] = await Promise.all([
      Project.find({}).lean(),
      BOQItem.find({}).lean(),
      CostEntry.find({}).lean(),
    ]);

    const projectRows = projects.map(project => {
      const id = String(project._id);
      const projectBoq = boq.filter(item => String(item.projectId) === id);
      const projectCosts = costs.filter(entry => String(entry.projectId) === id);
      const boqTotal = projectBoq.reduce((sum, item) => sum + Math.max(0, finite(item.totalCost ?? finite(item.quantity) * finite(item.unitCost))), 0);
      const actualCost = projectCosts.reduce((sum, entry) => sum + finite(entry.amount), 0);
      const budget = Math.max(0, finite(project.budget));
      const contractAmount = Math.max(0, finite(project.contractAmount));
      const physical = physicalProgress(projectBoq, projectCosts);
      const financial = contractAmount > 0 ? (actualCost / contractAmount) * 100 : 0;
      const budgetUtilization = budget > 0 ? (actualCost / budget) * 100 : 0;
      const boqUtilization = boqTotal > 0 ? (actualCost / boqTotal) * 100 : 0;

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
        budgetUtilization,
        boqUtilization,
        physicalProgress: physical,
        financialProgress: financial,
        progressGap: financial - physical,
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
        physicalProgress: projectRows.length ? projectRows.reduce((sum, project) => sum + project.physicalProgress, 0) / projectRows.length : 0,
        financialProgress: projectRows.length ? projectRows.reduce((sum, project) => sum + project.financialProgress, 0) / projectRows.length : 0,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import BOQItem from "@/models/BOQItem";
import CostEntry from "@/models/CostEntry";
import WorkSection from "@/models/WorkSection";
import { getSession } from "@/lib/session";

const finite = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function projectCompletion(sections: Array<{ progress?: number; items?: Array<{ quantity?: number; unitCost?: number }> }>) {
  if (!sections.length) return 0;
  let estimated = 0;
  let weighted = 0;
  for (const section of sections) {
    const sectionEstimate = (section.items || []).reduce(
      (sum, item) => sum + Math.max(0, finite(item.quantity)) * Math.max(0, finite(item.unitCost)),
      0,
    );
    const progress = Math.min(100, Math.max(0, finite(section.progress)));
    estimated += sectionEstimate;
    weighted += sectionEstimate * progress;
  }
  if (estimated > 0) return Math.min(100, Math.max(0, weighted / estimated));
  return Math.min(100, Math.max(0, sections.reduce((sum, section) => sum + Math.min(100, Math.max(0, finite(section.progress))), 0) / sections.length));
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const projectFilter = session.role === "Project Manager" ? { projectManagerId: session.id } : {};
    const [projects, boq, costs, sections] = await Promise.all([
      Project.find(projectFilter).lean(),
      BOQItem.find().lean(),
      CostEntry.find().lean(),
      WorkSection.find().lean(),
    ]);

    const sectionsByProject = new Map<string, typeof sections>();
    for (const section of sections) {
      const key = String(section.projectId);
      const list = sectionsByProject.get(key) || [];
      list.push(section);
      sectionsByProject.set(key, list);
    }

    const projectRows = projects.map((project) => {
      const id = String(project._id);
      const projectBoq = boq.filter((item) => String(item.projectId) === id);
      const projectCosts = costs.filter((entry) => String(entry.projectId) === id);

      const boqTotal = projectBoq.reduce((sum, item) => sum + finite(item.quantity) * finite(item.unitCost), 0);
      const actualCost = projectCosts.reduce((sum, entry) => sum + finite(entry.amount), 0);
      const budget = Math.max(0, finite(project.budget));
      const contractAmount = Math.max(0, finite(project.contractAmount));
      const physicalProgress = projectCompletion(sectionsByProject.get(id) || []);
      const financialProgress = contractAmount > 0 ? (actualCost / contractAmount) * 100 : 0;
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
        physicalProgress,
        financialProgress,
        progressGap: financialProgress - physicalProgress,
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

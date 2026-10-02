import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import CostEntry from "@/models/CostEntry";
import BOQItem from "@/models/BOQItem";
import { getSession, canAccessProject } from "@/lib/session";

type Context = { params: Promise<{ projectId: string }> };

const DEFAULT_SECTIONS = [
  "Foundation",
  "Structural Frame",
  "Walls",
  "Roof",
  "Doors & Windows",
  "Electrical",
  "Plumbing",
  "Finishes",
];

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;
    await connectDB();

    const project = await Project.findById(projectId).select("_id").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }

    const [sections, boqItems, costs] = await Promise.all([
      WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean(),
      BOQItem.find({ projectId }).select("_id workSectionId itemNo description category unit quantity unitCost totalCost").sort({ itemNo: 1 }).lean(),
      CostEntry.find({ projectId }).select("workSectionId boqItemId quantity amount").lean(),
    ]);

    const actualBySection = new Map<string, { quantity: number; amount: number }>();
    const actualByBOQ = new Map<string, { quantity: number; amount: number }>();

    costs.forEach((cost) => {
      const row = cost as unknown as { workSectionId?: unknown; boqItemId?: unknown; quantity?: unknown; amount?: unknown };
      const quantity = Number(row.quantity || 0);
      const amount = Number(row.amount || 0);

      if (row.boqItemId) {
        const key = String(row.boqItemId);
        const current = actualByBOQ.get(key) || { quantity: 0, amount: 0 };
        current.quantity += quantity;
        current.amount += amount;
        actualByBOQ.set(key, current);
      }

      // Only costs without a BOQ link are counted directly at section level.
      // BOQ-linked costs are picked up from their BOQ line, avoiding double counting.
      if (row.workSectionId && !row.boqItemId) {
        const key = String(row.workSectionId);
        const current = actualBySection.get(key) || { quantity: 0, amount: 0 };
        current.quantity += quantity;
        current.amount += amount;
        actualBySection.set(key, current);
      }
    });

    const boqBySection = new Map<string, typeof boqItems>();
    boqItems.forEach((item) => {
      if (!item.workSectionId) return;
      const key = String(item.workSectionId);
      const current = boqBySection.get(key) || [];
      current.push(item);
      boqBySection.set(key, current);
    });

    return NextResponse.json(sections.map((section) => {
      const boqLines = boqBySection.get(String(section._id)) || [];
      const derivedItems = boqLines.map((item) => {
        const actual = actualByBOQ.get(String(item._id)) || { quantity: 0, amount: 0 };
        return {
          _id: String(item._id),
          boqItemId: String(item._id),
          description: item.description,
          category: item.category === "Materials" ? "Material" : item.category,
          calculation: "",
          quantity: Number(item.quantity || 0),
          unit: item.unit,
          unitCost: Number(item.unitCost || 0),
          actualCost: actual.amount,
          ledgerActualQuantity: actual.quantity,
          ledgerActualCost: actual.amount,
          ledgerQuantityVariance: Number(item.quantity || 0) - actual.quantity,
          ledgerCostVariance: Number(item.totalCost || 0) - actual.amount,
          itemNo: item.itemNo,
          source: "BOQ",
        };
      });

      const legacyItems = (section.items as unknown as Array<Record<string, unknown>>)
        .filter((item) => !item.boqItemId)
        .map((item) => ({
          ...item,
          source: "Manual",
          ledgerActualQuantity: 0,
          ledgerActualCost: 0,
          ledgerQuantityVariance: 0,
          ledgerCostVariance: Number(item.quantity || 0) * Number(item.unitCost || 0) - Number(item.actualCost || 0),
        }));

      const items = [...derivedItems, ...legacyItems];
      const estimated = derivedItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0)
        + legacyItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
      const boqActual = derivedItems.reduce((sum, item) => sum + Number(item.ledgerActualCost || 0), 0);
      const directActual = actualBySection.get(String(section._id))?.amount || 0;
      const actual = boqActual + directActual + legacyItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0);

      const weightedCompletion = derivedItems.reduce((sum, item) => {
        const plannedCost = item.quantity * item.unitCost;
        const completion = item.quantity > 0
          ? Math.min(1, Math.max(0, Number(item.ledgerActualQuantity || 0) / item.quantity))
          : plannedCost > 0
            ? Math.min(1, Math.max(0, Number(item.ledgerActualCost || 0) / plannedCost))
            : 0;
        return sum + plannedCost * completion;
      }, 0);
      const legacyProgress = legacyItems.length
        ? legacyItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0) /
          Math.max(1, legacyItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0))
        : 0;
      const progress = estimated > 0
        ? Math.min(100, Math.max(0, ((weightedCompletion + legacyProgress * legacyItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0)) / estimated) * 100))
        : 0;

      return {
        ...section,
        items,
        estimated,
        ledgerActualCost: actual,
        actual,
        remaining: estimated - actual,
        calculatedProgress: Number(progress.toFixed(1)),
        progress: Number(progress.toFixed(1)),
        boqLineCount: derivedItems.length,
      };
    }));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch work sections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { projectId } = await params;
    const body = await request.json();
    await connectDB();

    const project = await Project.findById(projectId).select("_id").lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    if (!canAccessProject(session.role, null, session.id)) {
      return NextResponse.json({ error: "You do not have access to this project" }, { status: 403 });
    }

    const existingCount = await WorkSection.countDocuments({ projectId });
    const names = existingCount === 0 && body.useDefaultTemplate !== false
      ? DEFAULT_SECTIONS
      : [String(body.name || "").trim()];

    if (names.length === 1 && !names[0]) {
      return NextResponse.json({ error: "Work section name is required." }, { status: 400 });
    }

    const created = await WorkSection.insertMany(
      names.map((name, index) => ({
        projectId,
        name,
        order: existingCount + index,
        status: "Not Started",
        progress: 0,
        items: [],
      }))
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create work section" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import CostEntry from "@/models/CostEntry";
import BOQItem from "@/models/BOQItem";
import { getSession, canAccessProject } from "@/lib/session";

type Context = { params: Promise<{ projectId: string }> };

type SectionItem = {
  _id?: string;
  boqItemId?: string | null;
  description: string;
  category: string;
  calculation?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  actualCost?: number;
  ledgerActualQuantity: number;
  ledgerActualCost: number;
  ledgerQuantityVariance: number;
  ledgerCostVariance: number;
  itemNo?: string;
  source: "BOQ" | "Manual";
};

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

      if (row.workSectionId && !row.boqItemId) {
        const key = String(row.workSectionId);
        const current = actualBySection.get(key) || { quantity: 0, amount: 0 };
        current.quantity += quantity;
        current.amount += amount;
        actualBySection.set(key, current);
      }
    });

    const boqBySection = new Map<string, Array<{
      _id: unknown;
      workSectionId?: unknown;
      itemNo: string;
      description: string;
      category: string;
      unit: string;
      quantity: number;
      unitCost: number;
      totalCost: number;
    }>>();

    boqItems.forEach((item) => {
      if (!item.workSectionId) return;
      const key = String(item.workSectionId);
      const current = boqBySection.get(key) || [];
      current.push(item as unknown as BoqLine);
      boqBySection.set(key, current);
    });

    return NextResponse.json(sections.map((section) => {
      const boqLines = boqBySection.get(String(section._id)) || [];

      const derivedItems: SectionItem[] = boqLines.map((item) => {
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

      const legacyItems: SectionItem[] = (section.items as unknown as Array<Record<string, unknown>>)
        .filter((item) => !item.boqItemId)
        .map((item) => ({
          _id: item._id ? String(item._id) : undefined,
          description: String(item.description || ""),
          category: String(item.category || "Other"),
          calculation: String(item.calculation || ""),
          quantity: Number(item.quantity || 0),
          unit: String(item.unit || ""),
          unitCost: Number(item.unitCost || 0),
          actualCost: Number(item.actualCost || 0),
          boqItemId: null,
          ledgerActualQuantity: 0,
          ledgerActualCost: 0,
          ledgerQuantityVariance: 0,
          ledgerCostVariance: Number(item.quantity || 0) * Number(item.unitCost || 0) - Number(item.actualCost || 0),
          source: "Manual",
        }));

      const items: SectionItem[] = [...derivedItems, ...legacyItems];
      const estimated = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      const boqActual = derivedItems.reduce((sum, item) => sum + item.ledgerActualCost, 0);
      const directActual = actualBySection.get(String(section._id))?.amount || 0;
      const legacyActual = legacyItems.reduce((sum, item) => sum + Number(item.actualCost || 0), 0);
      const actual = boqActual + directActual + legacyActual;

      const weightedCompletion = derivedItems.reduce((sum, item) => {
        const plannedCost = item.quantity * item.unitCost;
        const completion = item.quantity > 0
          ? Math.min(1, Math.max(0, item.ledgerActualQuantity / item.quantity))
          : plannedCost > 0
            ? Math.min(1, Math.max(0, item.ledgerActualCost / plannedCost))
            : 0;
        return sum + plannedCost * completion;
      }, 0);

      const legacyPlanned = legacyItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
      const legacyCompletedValue = legacyItems.reduce((sum, item) => sum + Math.min(item.quantity * item.unitCost, Math.max(0, Number(item.actualCost || 0))), 0);
      const progress = estimated > 0
        ? Math.min(100, Math.max(0, ((weightedCompletion + legacyCompletedValue) / estimated) * 100))
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

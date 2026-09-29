import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import WorkSection from "@/models/WorkSection";
import CostEntry from "@/models/CostEntry";

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
    const { projectId } = await params;
    await connectDB();
    const [sections, costs] = await Promise.all([
      WorkSection.find({ projectId }).sort({ order: 1, createdAt: 1 }).lean(),
      CostEntry.find({ projectId }).select("workSectionId boqItemId quantity amount").lean(),
    ]);
    const actualBySection = new Map<string, number>();
    const actualByBOQ = new Map<string, { quantity: number; amount: number }>();
    costs.forEach((cost) => {
      const row = cost as unknown as { workSectionId?: unknown; boqItemId?: unknown; quantity?: unknown; amount?: unknown };
      if (row.workSectionId) {
        const sectionKey = String(row.workSectionId);
        actualBySection.set(sectionKey, (actualBySection.get(sectionKey) || 0) + Number(row.amount || 0));
      }
      if (row.boqItemId) {
        const boqKey = String(row.boqItemId);
        const current = actualByBOQ.get(boqKey) || { quantity: 0, amount: 0 };
        current.quantity += Number(row.quantity || 0);
        current.amount += Number(row.amount || 0);
        actualByBOQ.set(boqKey, current);
      }
    });

    return NextResponse.json(sections.map((section) => ({
      ...section,
      ledgerActualCost: actualBySection.get(String(section._id)) || 0,
      items: (section.items as unknown as Array<Record<string, unknown>>).map((item) => {
        const actual = item.boqItemId ? actualByBOQ.get(String(item.boqItemId)) : undefined;
        return {
          ...item,
          ledgerActualQuantity: actual?.quantity || 0,
          ledgerActualCost: actual?.amount || 0,
          ledgerQuantityVariance: Number(item.quantity || 0) - (actual?.quantity || 0),
          ledgerCostVariance: Number(item.quantity || 0) * Number(item.unitCost || 0) - (actual?.amount || 0),
        };
      }),
    })));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch work sections" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    await connectDB();

    const project = await Project.findById(projectId).lean();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

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

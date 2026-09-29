import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WorkSection from "@/models/WorkSection";
import BOQItem from "@/models/BOQItem";

type Context = { params: Promise<{ projectId: string; sectionId: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { projectId, sectionId } = await params;
    const body = await request.json();
    await connectDB();

    const update: Record<string, unknown> = {};
    for (const key of ["name", "description", "order", "status", "progress", "items"]) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (update.progress !== undefined) {
      update.progress = Math.max(0, Math.min(100, Number(update.progress)));
    }

    if (Array.isArray(update.items)) {
      const items = update.items as Array<Record<string, unknown>>;
      const boqIds = items.map((item) => String(item.boqItemId || "").trim()).filter(Boolean);
      if (boqIds.length) {
        const valid = await BOQItem.countDocuments({ _id: { $in: boqIds }, projectId });
        if (valid !== boqIds.length) return NextResponse.json({ error: "One or more BOQ items do not belong to this project" }, { status: 400 });
        update.items = items.map((item) => ({ ...item, boqItemId: String(item.boqItemId || "").trim() || null }));
      }
    }

    const section = await WorkSection.findOneAndUpdate(
      { _id: sectionId, projectId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!section) return NextResponse.json({ error: "Work section not found" }, { status: 404 });
    return NextResponse.json(section);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update work section" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { projectId, sectionId } = await params;
    await connectDB();
    const deleted = await WorkSection.findOneAndDelete({ _id: sectionId, projectId });
    if (!deleted) return NextResponse.json({ error: "Work section not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete work section" }, { status: 400 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import WorkSection from "@/models/WorkSection";

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

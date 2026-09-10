import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import ProjectProgress from "@/models/ProjectProgress";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid progress ID" }, { status: 400 });
    await connectDB();
    const result = await ProjectProgress.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Progress record not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { console.error(error); return NextResponse.json({ error: "Failed to delete progress" }, { status: 500 }); }
}

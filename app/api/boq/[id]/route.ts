import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import BOQItem from "@/models/BOQItem";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await connectDB();
    const result = await BOQItem.findByIdAndDelete(id);
    if (!result) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete BOQ item" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";

export async function GET(request: NextRequest) {
  try { await connectDB(); const projectId = request.nextUrl.searchParams.get("projectId"); const rows = await Expense.find(projectId ? { projectId } : {}).sort({ date: -1 }).lean(); return NextResponse.json(rows); }
  catch (e) { console.error(e); return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 }); }
}
export async function POST(request: NextRequest) {
  try { const b = await request.json(); await connectDB(); const row = await Expense.create({ projectId:b.projectId,date:b.date,category:b.category,description:b.description,amount:Number(b.amount),reference:b.reference||"",notes:b.notes||"" }); return NextResponse.json(row,{status:201}); }
  catch (e) { console.error(e); return NextResponse.json({ error: "Failed to create expense" }, { status:400 }); }
}

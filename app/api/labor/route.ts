import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import LaborEntry from "@/models/LaborEntry";

export async function GET(request: NextRequest) { try { await connectDB(); const projectId=request.nextUrl.searchParams.get("projectId"); return NextResponse.json(await LaborEntry.find(projectId?{projectId}:{}).sort({date:-1}).lean()); } catch(e){console.error(e);return NextResponse.json({error:"Failed to fetch labor"},{status:500});} }
export async function POST(request: NextRequest) { try { const b=await request.json(); await connectDB(); const row=await LaborEntry.create({projectId:b.projectId,employeeName:b.employeeName,role:b.role,date:b.date,hours:Number(b.hours),hourlyRate:Number(b.hourlyRate),notes:b.notes||""}); return NextResponse.json(row,{status:201}); } catch(e){console.error(e);return NextResponse.json({error:"Failed to create labor entry"},{status:400});} }

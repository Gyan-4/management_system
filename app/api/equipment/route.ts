import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import EquipmentUsage from "@/models/EquipmentUsage";

export async function GET(request: NextRequest) { try { await connectDB(); const projectId=request.nextUrl.searchParams.get("projectId"); return NextResponse.json(await EquipmentUsage.find(projectId?{projectId}:{}).sort({date:-1}).lean()); } catch(e){console.error(e);return NextResponse.json({error:"Failed to fetch equipment"},{status:500});} }
export async function POST(request: NextRequest) { try { const b=await request.json(); await connectDB(); const row=await EquipmentUsage.create({projectId:b.projectId,equipmentName:b.equipmentName,date:b.date,hours:Number(b.hours),ratePerHour:Number(b.ratePerHour),operator:b.operator||"",notes:b.notes||""}); return NextResponse.json(row,{status:201}); } catch(e){console.error(e);return NextResponse.json({error:"Failed to create equipment entry"},{status:400});} }

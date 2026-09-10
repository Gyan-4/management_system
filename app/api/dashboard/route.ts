import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Project from "@/models/Project";
import BOQItem from "@/models/BOQItem";
import Expense from "@/models/Expense";
import LaborEntry from "@/models/LaborEntry";
import EquipmentUsage from "@/models/EquipmentUsage";

export async function GET() {
  try {
    await connectDB();
    const [projects, boq, expenses, labor, equipment] = await Promise.all([
      Project.find().lean(), BOQItem.find().lean(), Expense.find().lean(), LaborEntry.find().lean(), EquipmentUsage.find().lean(),
    ]);
    const actualByProject = projects.map(p => {
      const material = boq.filter(x=>String(x.projectId)===String(p._id)&&x.category==="Materials").reduce((s,x)=>s+x.quantity*x.unitCost,0);
      const laborCost = labor.filter(x=>String(x.projectId)===String(p._id)).reduce((s,x)=>s+x.hours*x.hourlyRate,0);
      const equipmentCost = equipment.filter(x=>String(x.projectId)===String(p._id)).reduce((s,x)=>s+x.hours*x.ratePerHour,0);
      const other = expenses.filter(x=>String(x.projectId)===String(p._id)).reduce((s,x)=>s+x.amount,0);
      return {_id:p._id,name:p.name,client:p.client,status:p.status,budget:p.budget,contractAmount:p.contractAmount,boqTotal:boq.filter(x=>String(x.projectId)===String(p._id)).reduce((s,x)=>s+x.quantity*x.unitCost,0),actualCost:material+laborCost+equipmentCost+other};
    });
    return NextResponse.json({projects:actualByProject, totals:{contract:projects.reduce((s,p)=>s+p.contractAmount,0),budget:projects.reduce((s,p)=>s+p.budget,0),actual:actualByProject.reduce((s,p)=>s+p.actualCost,0),boq:actualByProject.reduce((s,p)=>s+p.boqTotal,0)}});
  } catch(e) { console.error(e); return NextResponse.json({error:"Failed to load dashboard"},{status:500}); }
}

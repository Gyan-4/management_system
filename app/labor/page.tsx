"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Users } from "lucide-react";
import CostLedger from "@/app/components/CostLedger";
import { useProject } from "@/app/components/ProjectContext";

type Entry={_id:string;date:string;description:string;quantity:number;unit:string;unitCost:number;amount:number;supplierOrEmployee?:string};
type SectionItem={_id?:string;description:string;category:string;quantity:number;unit:string;unitCost:number;actualCost?:number};
type Section={_id:string;name:string;items:SectionItem[]};

const money=(n:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);

export default function LaborPage(){
 const { projects, projectId, setProjectId } = useProject();
 const [entries,setEntries]=useState<Entry[]>([]);
 const [sections,setSections]=useState<Section[]>([]);
 const [period,setPeriod]=useState("all");

 useEffect(()=>{
   if(!projectId){setEntries([]);setSections([]);return;}
   fetch("/api/costs?projectId="+encodeURIComponent(projectId)+"&category=Labor",{cache:"no-store"})
     .then(r=>r.json())
     .then(d=>setEntries(Array.isArray(d)?d:[]));
   fetch("/api/projects/"+encodeURIComponent(projectId)+"/sections",{cache:"no-store"})
     .then(r=>r.json())
     .then(d=>setSections(Array.isArray(d)?d:[]));
 },[projectId]);

 const filtered=useMemo(()=>{
   if(period==="all")return entries;
   const now=Date.now();
   const days=Number(period);
   return entries.filter(x=>(now-new Date(x.date).getTime())<=days*86400000);
 },[entries,period]);

 const total=filtered.reduce((s,x)=>s+Number(x.amount||0),0);
 const workers=new Set(filtered.map(x=>(x.supplierOrEmployee||x.description||"Unassigned").trim())).size;

 const plannedLabor=useMemo(
   ()=>sections.flatMap(section=>
     (section.items||[])
       .filter(item=>item.category==="Labor")
       .map(item=>({
         sectionName:section.name,
         description:item.description,
         quantity:Number(item.quantity||0),
         unit:item.unit||"—",
         unitCost:Number(item.unitCost||0),
         estimated:Number(item.quantity||0)*Number(item.unitCost||0),
       }))
   ),
   [sections]
 );

 const plannedLaborTotal=plannedLabor.reduce((sum,item)=>sum+item.estimated,0);

 function exportCsv(){
   const lines=["Date,Worker / Employee,Description,Qty,Unit,Rate,Amount",...filtered.map(x=>[x.date,'"'+(x.supplierOrEmployee||"").replaceAll('"','""')+'"','"'+x.description.replaceAll('"','""')+'"',x.quantity,x.unit,x.unitCost,x.amount].join(","))];
   const blob=new Blob([lines.join("\n")],{type:"text/csv"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="labor-payroll.csv";a.click();URL.revokeObjectURL(url);
 }

 return <main className="min-h-screen p-5 md:p-8"><div className="mx-auto max-w-[1500px]">
   <div className="mb-5 border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
     <div><div className="flex items-center gap-2 text-sm font-bold"><Users size={17}/>Payroll Overview</div><p className="mt-1 text-xs text-slate-500">Actual labor costs come from the project cost ledger. Planned labor below comes from Project Breakdown.</p></div>
     <div className="flex flex-wrap gap-2">
      <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm">{projects.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}</select>
      <select value={period} onChange={e=>setPeriod(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm"><option value="all">All records</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select>
      <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"><Download size={15}/> Export CSV</button>
     </div>
    </div>
   </div>

   <div className="mb-6 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-4">
    <Summary label="Payroll Cost" value={money(total)}/>
    <Summary label="Labor Entries" value={String(filtered.length)}/>
    <Summary label="Workers / Employees" value={String(workers)}/>
    <Summary label="Planned Labor" value={money(plannedLaborTotal)}/>
   </div>

   <section className="mb-6 border border-slate-200 bg-white">
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="font-bold text-slate-900">Labor from Project Breakdown</h2>
      <p className="mt-1 text-xs text-slate-500">Labor items saved under a work section appear here as planned labor. Recording an actual payment remains a separate payroll/cost-ledger entry.</p>
    </div>
    {plannedLabor.length ? (
      <div className="overflow-x-auto">
        <table className="data-table min-w-[760px] text-sm">
          <thead><tr><th>Work Section</th><th>Description</th><th className="text-right">Planned Qty</th><th>Unit</th><th className="text-right">Rate</th><th className="text-right">Estimated Labor</th></tr></thead>
          <tbody>{plannedLabor.map((item,index)=><tr key={item.description+"-"+item.sectionName+"-"+index}>
            <td className="font-semibold">{item.sectionName}</td>
            <td>{item.description}</td>
            <td className="text-right tabular-nums">{item.quantity.toLocaleString()}</td>
            <td>{item.unit}</td>
            <td className="text-right tabular-nums">{money(item.unitCost)}</td>
            <td className="text-right font-bold tabular-nums">{money(item.estimated)}</td>
          </tr>)}</tbody>
          <tfoot><tr><td colSpan={5} className="text-right font-bold">PLANNED LABOR TOTAL</td><td className="text-right font-bold">{money(plannedLaborTotal)}</td></tr></tfoot>
        </table>
      </div>
    ) : (
      <div className="p-10 text-center text-sm text-slate-500">No Labor items have been added to the Project Breakdown yet.</div>
    )}
   </section>

   <CostLedger category="Labor" title="Labor & Payroll" description="Record wages, labor days, and payroll-related project costs." />
 </div></main>
}

function Summary({label,value}:{label:string;value:string}){return <div className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-xl font-bold tabular-nums">{value}</div></div>}

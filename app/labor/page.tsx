"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Users } from "lucide-react";
import CostLedger from "@/app/components/CostLedger";

type Project={_id:string;name:string};
type Entry={_id:string;date:string;description:string;quantity:number;unit:string;unitCost:number;amount:number;supplierOrEmployee?:string};

const money=(n:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:2}).format(n);

export default function LaborPage(){
 const [projects,setProjects]=useState<Project[]>([]);
 const [projectId,setProjectId]=useState("");
 const [entries,setEntries]=useState<Entry[]>([]);
 const [period,setPeriod]=useState("all");

 useEffect(()=>{fetch("/api/projects",{cache:"no-store"}).then(r=>r.json()).then(d=>{const list=Array.isArray(d)?d:[];setProjects(list);if(list[0])setProjectId(list[0]._id)})},[]);
 useEffect(()=>{if(!projectId)return;fetch("/api/costs?projectId="+encodeURIComponent(projectId)+"&category=Labor",{cache:"no-store"}).then(r=>r.json()).then(d=>setEntries(Array.isArray(d)?d:[]))},[projectId]);

 const filtered=useMemo(()=>{if(period==="all")return entries;const now=Date.now();const days=Number(period);return entries.filter(x=>(now-new Date(x.date).getTime())<=days*86400000)},[entries,period]);
 const total=filtered.reduce((s,x)=>s+Number(x.amount||0),0);
 const workers=new Set(filtered.map(x=>(x.supplierOrEmployee||x.description||"Unassigned").trim())).size;

 function exportCsv(){
   const lines=["Date,Worker / Employee,Description,Qty,Unit,Rate,Amount",...filtered.map(x=>[x.date,'"'+(x.supplierOrEmployee||"").replaceAll('"','""')+'"','"'+x.description.replaceAll('"','""')+'"',x.quantity,x.unit,x.unitCost,x.amount].join(","))];
   const blob=new Blob([lines.join("\n")],{type:"text/csv"});
   const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;a.download="labor-payroll.csv";a.click();URL.revokeObjectURL(url);
 }

 return <main className="min-h-screen p-5 md:p-8"><div className="mx-auto max-w-[1500px]">
   <div className="mb-5 border border-slate-200 bg-white p-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
     <div><div className="flex items-center gap-2 text-sm font-bold"><Users size={17}/>Payroll Overview</div><p className="mt-1 text-xs text-slate-500">Quick labor-cost summary from the project cost ledger.</p></div>
     <div className="flex flex-wrap gap-2">
      <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm">{projects.map(p=><option key={p._id} value={p._id}>{p.name}</option>)}</select>
      <select value={period} onChange={e=>setPeriod(e.target.value)} className="border border-slate-300 px-3 py-2 text-sm"><option value="all">All records</option><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select>
      <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"><Download size={15}/> Export CSV</button>
     </div>
    </div>
   </div>
   <div className="mb-6 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3"><Summary label="Payroll Cost" value={money(total)}/><Summary label="Labor Entries" value={String(filtered.length)}/><Summary label="Workers / Employees" value={String(workers)}/></div>
   <CostLedger category="Labor" title="Labor & Payroll" description="Record wages, labor days, and payroll-related project costs." />
 </div></main>
}
function Summary({label,value}:{label:string;value:string}){return <div className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-xl font-bold tabular-nums">{value}</div></div>}

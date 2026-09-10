"use client";

import { useState } from "react";
import { Building2, ClipboardList, LayoutDashboard, Package, Users, Truck, Receipt, BarChart3, Settings, ChevronRight, Plus, AlertTriangle } from "lucide-react";

const money=(n:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(n);
const projects=[
 {name:"Riverside Building",client:"ABC Development",progress:72,budget:10200000,actual:6800000},
 {name:"Warehouse Expansion",client:"Northline Trading",progress:48,budget:5800000,actual:3200000},
 {name:"Residential Building",client:"Private Client",progress:61,budget:4400000,actual:3250000}
];
const nav=[
 ["Dashboard",LayoutDashboard],["Projects",Building2],["BOQ / Estimation",ClipboardList],["Materials",Package],["Labor & Payroll",Users],["Equipment",Truck],["Expenses",Receipt],["Cost Analysis",BarChart3],["Reports",BarChart3],["Settings",Settings]
] as const;

export default function Home(){
 const [active,setActive]=useState("Dashboard");
 const totalBudget=projects.reduce((s,p)=>s+p.budget,0), totalActual=projects.reduce((s,p)=>s+p.actual,0);
 return <div className="min-h-screen md:flex">
  <aside className="sidebar w-full shrink-0 text-white md:min-h-screen md:w-64">
   <div className="border-b border-white/10 px-6 py-5"><div className="text-xl font-bold">ConstructFlow</div><div className="mt-1 text-xs text-white/50">Construction Management</div></div>
   <nav className="space-y-1 p-4">{nav.map(([label,Icon])=><button key={label} onClick={()=>setActive(label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${active===label?"bg-white/10 font-semibold":"text-white/65 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/><span>{label}</span></button>)}</nav>
  </aside>
  <main className="min-w-0 flex-1">
   <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 md:px-8"><div><h1 className="text-xl font-bold">{active}</h1><p className="mt-1 text-sm text-gray-500">Construction project overview</p></div><div className="flex items-center gap-3"><button className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"><AlertTriangle size={17}/></button><div className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium">Engineer</div></div></header>
   <div className="space-y-6 p-5 md:p-8">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Good evening</h2><p className="mt-1 text-sm text-gray-500">Here&apos;s what&apos;s happening with your projects.</p></div><button className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={17}/> New Project</button></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat title="Active Projects" value="3" detail="Currently in progress"/><Stat title="Contract Value" value={money(24850000)} detail="Across active projects"/><Stat title="Total Budget" value={money(totalBudget)} detail="Estimated project cost"/><Stat title="Actual Cost" value={money(totalActual)} detail="Recorded spending"/></section>
    <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
     <div className="card overflow-hidden"><div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-bold">Project Cost Overview</h2><p className="text-sm text-gray-500">Budget compared with actual cost</p></div><button className="flex items-center gap-1 text-sm font-semibold text-slate-700">View all <ChevronRight size={15}/></button></div>
      <div className="divide-y divide-gray-100">{projects.map(p=><div key={p.name} className="p-5"><div className="flex items-center justify-between"><div><div className="font-semibold">{p.name}</div><div className="text-sm text-gray-500">{p.client}</div></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{p.progress}%</span></div><div className="mt-4 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-slate-800" style={{width:`${p.progress}%`}}/></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><Metric label="Budget" value={money(p.budget)}/><Metric label="Actual" value={money(p.actual)}/><Metric label="Remaining" value={money(p.budget-p.actual)} good/></div></div>)}</div>
     </div>
     <div className="card"><div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold">Cost Breakdown</h2><p className="text-sm text-gray-500">Current spending by category</p></div><div className="space-y-5 p-5"><CostRow label="Materials" pct={45} amount={totalActual*.45}/><CostRow label="Labor" pct={25} amount={totalActual*.25}/><CostRow label="Equipment" pct={15} amount={totalActual*.15}/><CostRow label="Other Expenses" pct={15} amount={totalActual*.15}/></div></div>
    </section>
    <section className="grid gap-6 lg:grid-cols-2"><div className="card p-5"><h2 className="font-bold">Budget Alerts</h2><p className="mt-1 text-sm text-gray-500">Items requiring attention</p><div className="mt-5 space-y-3"><Alert title="Steel reinforcement" detail="Actual cost is ₱85,000 above estimate."/><Alert title="Concrete" detail="Actual cost is ₱32,500 above estimate."/></div></div><div className="card p-5"><h2 className="font-bold">Quick Actions</h2><p className="mt-1 text-sm text-gray-500">Common project management tasks</p><div className="mt-5 grid grid-cols-2 gap-3">{["New Project","Add BOQ Item","Record Expense","Record Purchase"].map(x=><button key={x} className="rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-semibold hover:bg-gray-50">{x}</button>)}</div></div></section>
   </div>
  </main>
 </div>
}
function Stat({title,value,detail}:{title:string,value:string,detail:string}){return <div className="card p-5"><div className="text-sm text-gray-500">{title}</div><div className="stat-number mt-2 text-2xl font-bold">{value}</div><div className="mt-2 text-xs text-gray-500">{detail}</div></div>}
function Metric({label,value,good}:{label:string,value:string,good?:boolean}){return <div><div className="text-gray-500">{label}</div><div className={`font-semibold ${good?"text-green-600":""}`}>{value}</div></div>}
function CostRow({label,pct,amount}:{label:string,pct:number,amount:number}){return <div><div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-semibold">{money(amount)}</span></div><div className="mt-2 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-slate-700" style={{width:`${pct}%`}}/></div><div className="mt-1 text-xs text-gray-500">{pct}% of actual cost</div></div>}
function Alert({title,detail}:{title:string,detail:string}){return <div className="rounded-xl border border-red-100 bg-red-50 p-4"><div className="font-semibold text-red-800">{title}</div><div className="mt-1 text-sm text-red-700">{detail}</div></div>}

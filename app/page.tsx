"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ClipboardList, DollarSign, Plus, Wallet } from "lucide-react";

type Project = { _id: string; name: string; client: string; budget: number; contractAmount: number; status: string };
type Analysis = { actualTotal: number; physicalProgress: number; financialProgress: number; progressGap: number; spent: Record<string, number> };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(async p => {
      const list = Array.isArray(p) ? p : [];
      setProjects(list);
      const results = await Promise.all(list.map(async (x: Project) => {
        const r = await fetch(`/api/cost-analysis?projectId=${x._id}`);
        return r.ok ? [x._id, await r.json()] as const : null;
      }));
      setAnalyses(Object.fromEntries(results.filter(Boolean) as [string, Analysis][]));
    });
  }, []);

  const totals = useMemo(() => ({
    contract: projects.reduce((s, p) => s + p.contractAmount, 0),
    budget: projects.reduce((s, p) => s + p.budget, 0),
    actual: projects.reduce((s, p) => s + (analyses[p._id]?.actualTotal || 0), 0),
    active: projects.filter(p => p.status === "Active").length,
  }), [projects, analyses]);

  const overBudget = projects.filter(p => (analyses[p._id]?.actualTotal || 0) > p.budget);

  return <main className="min-h-screen">
    <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Project Control</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Construction cost, budget and project performance overview.</p></div>
        <Link href="/projects" className="flex shrink-0 items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={16}/> New Project</Link>
      </div>
    </header>

    <div className="mx-auto max-w-[1500px] space-y-6 p-5 md:p-8">
      <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Active Projects" value={String(totals.active)} note={`${projects.length} total projects`} icon={<ClipboardList size={17}/>}/>
        <Kpi label="Contract Value" value={money(totals.contract)} note="Total awarded value" icon={<DollarSign size={17}/>}/>
        <Kpi label="Project Budget" value={money(totals.budget)} note="Current planned cost" icon={<Wallet size={17}/>}/>
        <Kpi label="Actual Cost" value={money(totals.actual)} note={totals.budget ? `${(totals.actual / totals.budget * 100).toFixed(1)}% of budget` : "No recorded costs"} icon={<ArrowUpRight size={17}/>}/>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-bold">Project Control Register</h2><p className="mt-1 text-xs text-slate-500">Budget, actual cost and physical progress by project.</p></div><Link href="/projects" className="text-xs font-bold text-blue-600">View projects →</Link></div>
          <div className="overflow-x-auto"><table className="data-table min-w-[850px] text-sm"><thead><tr><th>Project</th><th>Status</th><th className="text-right">Budget</th><th className="text-right">Actual</th><th className="text-right">Physical</th><th className="text-right">Cost Used</th></tr></thead><tbody>{projects.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">No projects recorded.</td></tr> : projects.map(p => { const a = analyses[p._id]; const actual = a?.actualTotal || 0; const costPct = p.budget ? actual / p.budget * 100 : 0; return <tr key={p._id}><td><div className="font-bold text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.client}</div></td><td><span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase">{p.status}</span></td><td className="text-right tabular-nums">{money(p.budget)}</td><td className="text-right font-semibold tabular-nums">{money(actual)}</td><td className="text-right tabular-nums">{a ? `${a.physicalProgress.toFixed(1)}%` : "—"}</td><td className={`text-right font-bold tabular-nums ${costPct > 100 ? "text-red-600" : ""}`}>{costPct.toFixed(1)}%</td></tr>; })}</tbody></table></div>
        </div>

        <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Cost Distribution</h2><p className="mt-1 text-xs text-slate-500">Actual spending across all projects.</p></div><div className="space-y-5 p-5">{[["Materials","Material"],["Labor","Labor"],["Equipment","Equipment"],["Other Expenses","Expense"]].map(([label,key]) => { const amount = Object.values(analyses).reduce((s,a) => s + (a.spent?.[key] || 0),0); const pct = totals.actual ? amount / totals.actual * 100 : 0; return <div key={label}><div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="font-bold tabular-nums">{money(amount)}</span></div><div className="mt-2 h-1.5 bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${Math.min(100,pct)}%`}}/></div><div className="mt-1 text-[11px] text-slate-500">{pct.toFixed(1)}% of actual cost</div></div>; })}</div></div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Project Performance</h2><p className="mt-1 text-xs text-slate-500">Physical work completed compared with financial progress.</p></div><div className="divide-y divide-slate-200">{projects.slice(0,6).map(p => { const a=analyses[p._id]; if(!a)return null; const gap=a.progressGap; return <div key={p._id} className="p-5"><div className="flex justify-between gap-4"><div className="font-semibold">{p.name}</div><div className={`text-xs font-bold ${gap>10?"text-red-600":"text-slate-500"}`}>{gap >= 0 ? "+" : ""}{gap.toFixed(1)} pts</div></div><div className="mt-3 grid grid-cols-2 gap-4"><Progress label="Physical Progress" value={a.physicalProgress}/><Progress label="Financial Progress" value={a.financialProgress}/></div>{gap>10&&<div className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-700"><AlertTriangle size={14}/> Spending is ahead of physical progress.</div>}</div>; })}{projects.length===0&&<div className="p-8 text-center text-sm text-slate-500">Add a project to begin monitoring.</div>}</div></div>
        <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Control Alerts</h2><p className="mt-1 text-xs text-slate-500">Items that need project manager attention.</p></div><div className="p-5">{overBudget.length===0?<div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No projects are currently over budget.</div>:<div className="space-y-3">{overBudget.map(p=>{const actual=analyses[p._id]?.actualTotal||0;return <div key={p._id} className="border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle size={16}/>{p.name}</div><div className="mt-1 text-xs text-red-700">Actual cost exceeds budget by {money(actual-p.budget)}.</div></div>})}</div>}</div></div>
      </section>
    </div>
  </main>;
}

function Kpi({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){return <div className="bg-white p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{icon}{label}</div><div className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></div>}
function Progress({label,value}:{label:string;value:number}){return <div><div className="flex justify-between text-[11px] font-semibold text-slate-500"><span>{label}</span><span>{value.toFixed(1)}%</span></div><div className="mt-1.5 h-1.5 bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${Math.min(100,Math.max(0,value))}%`}}/></div></div>}

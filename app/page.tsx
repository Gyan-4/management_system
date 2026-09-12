"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, ClipboardList, DollarSign, Plus, Wallet, RefreshCw } from "lucide-react";

type Project = { _id: string; name: string; client?: string; budget: number; contractAmount: number; status: string; actualCost: number; remainingBudget: number; budgetUtilization: number; projectedProfit: number };
type Dashboard = { projects: Project[]; totals: { contract: number; budget: number; actual: number; boq: number; remainingBudget: number; projectedProfit: number } };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");\n  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Could not load dashboard."); return r.json(); })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Could not load dashboard."));
  }, []);

  const projects = data?.projects || [];
  const totals = data?.totals || { contract: 0, budget: 0, actual: 0, boq: 0, remainingBudget: 0, projectedProfit: 0 };
  const overBudget = useMemo(() => projects.filter(p => p.remainingBudget < 0), [projects]);

  return <main className="min-h-screen">
    <header className="border-b border-slate-200 bg-white px-5 py-5 md:px-8">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
        <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Project Control</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Dashboard</h1><p className="mt-1 text-sm text-slate-500">Construction cost, budget and project performance overview.</p></div>
        <div className="flex shrink-0 gap-2"><button onClick={loadDashboard} disabled={refreshing} className="flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold disabled:opacity-50"><RefreshCw size={15} className={refreshing?"animate-spin":""}/> Refresh</button><Link href="/projects" className="flex items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={16}/> New Project</Link></div>
      </div>
    </header>
    <div className="mx-auto max-w-[1500px] space-y-6 p-5 md:p-8">
      {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {!data && !error && <div className="border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading project controls...</div>}
      {data && <>
        <section className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Active Projects" value={String(projects.filter(p => p.status === "Active").length)} note={`${projects.length} total projects`} icon={<ClipboardList size={17}/>}/>
          <Kpi label="Contract Value" value={money(totals.contract)} note="Total awarded value" icon={<DollarSign size={17}/>}/>
          <Kpi label="Project Budget" value={money(totals.budget)} note="Current planned cost" icon={<Wallet size={17}/>}/>
          <Kpi label="Actual Cost" value={money(totals.actual)} note={totals.budget ? `${(totals.actual / totals.budget * 100).toFixed(1)}% of budget` : "No recorded costs"} icon={<ArrowUpRight size={17}/>}/>
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="text-sm font-bold">Project Control Register</h2><p className="mt-1 text-xs text-slate-500">Financial position for every project.</p></div><Link href="/projects" className="text-xs font-bold text-blue-600">View projects →</Link></div>
            <div className="overflow-x-auto"><table className="data-table min-w-[850px] text-sm"><thead><tr><th>Project</th><th>Status</th><th className="text-right">Budget</th><th className="text-right">Actual</th><th className="text-right">Remaining</th><th className="text-right">Used</th></tr></thead><tbody>{projects.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-slate-500">No projects recorded.</td></tr> : projects.map(p => <tr key={p._id}><td><div className="font-bold text-slate-900">{p.name}</div><div className="text-xs text-slate-500">{p.client || "No client recorded"}</div></td><td><span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase">{p.status}</span></td><td className="text-right tabular-nums">{money(p.budget)}</td><td className="text-right font-semibold tabular-nums">{money(p.actualCost)}</td><td className={`text-right font-bold tabular-nums ${p.remainingBudget < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(p.remainingBudget)}</td><td className={`text-right font-bold tabular-nums ${p.budgetUtilization > 100 ? "text-red-600" : ""}`}>{p.budgetUtilization.toFixed(1)}%</td></tr>)}</tbody></table></div>
          </div>
          <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Portfolio Financial Position</h2><p className="mt-1 text-xs text-slate-500">Current totals across all projects.</p></div><div className="divide-y divide-slate-200"><Metric label="BOQ Estimate" value={money(totals.boq)}/><Metric label="Actual Cost" value={money(totals.actual)}/><Metric label="Remaining Budget" value={money(totals.remainingBudget)} danger={totals.remainingBudget < 0}/><Metric label="Projected Profit" value={money(totals.projectedProfit)} danger={totals.projectedProfit < 0}/></div></div>
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Budget Alerts</h2><p className="mt-1 text-xs text-slate-500">Projects requiring financial attention.</p></div><div className="p-5">{overBudget.length === 0 ? <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">No projects are currently over budget.</div> : <div className="space-y-3">{overBudget.map(p => <div key={p._id} className="border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle size={16}/>{p.name}</div><div className="mt-1 text-xs text-red-700">Budget exceeded by {money(Math.abs(p.remainingBudget))}.</div><Link href={`/cost-analysis?projectId=${p._id}`} className="mt-2 inline-block text-xs font-bold text-red-800 underline">Open cost control</Link></div>)}</div>}</div></div>
          <div className="card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">Quick Actions</h2><p className="mt-1 text-xs text-slate-500">Common project-control workflows.</p></div><div className="grid sm:grid-cols-2">{[["New project","Create or update a project record","/projects"],["Prepare BOQ","Build the project cost estimate","/boq"],["Record costs","Log actual project spending","/costs"],["Track progress","Update physical progress","/progress"]].map(([title,note,href]) => <Link key={href} href={href} className="border-b border-r border-slate-200 p-5 hover:bg-slate-50"><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs text-slate-500">{note}</div><div className="mt-3 text-xs font-bold text-blue-600">Open →</div></Link>)}</div></div>
        </section>
      </>}
    </div>
  </main>;
}
function Kpi({label,value,note,icon}:{label:string;value:string;note:string;icon:React.ReactNode}){return <div className="bg-white p-5"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{icon}{label}</div><div className="mt-2 text-xl font-bold tracking-tight tabular-nums">{value}</div><div className="mt-1 text-[11px] text-slate-500">{note}</div></div>}
function Metric({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <div className="flex items-center justify-between gap-4 p-5"><span className="text-xs font-semibold text-slate-500">{label}</span><span className={`font-bold tabular-nums ${danger?"text-red-600":"text-slate-900"}`}>{value}</span></div>}

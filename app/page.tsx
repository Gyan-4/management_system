"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";

type Project = { _id: string; name: string; client: string; budget: number; contractAmount: number; status: string };
type Analysis = { spent: Record<string, number>; actualTotal: number };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({});

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(async (p) => {
        const list = Array.isArray(p) ? p : [];
        setProjects(list);
        const pairs = await Promise.all(list.map(async (x: Project) => {
          const r = await fetch(`/api/cost-analysis?projectId=${x._id}`);
          return r.ok ? ([x._id, await r.json()] as const) : null;
        }));
        setAnalyses(Object.fromEntries(pairs.filter(Boolean) as [string, Analysis][]));
      });
  }, []);

  const totals = useMemo(() => ({
    budget: projects.reduce((s, p) => s + p.budget, 0),
    actual: projects.reduce((s, p) => s + (analyses[p._id]?.actualTotal || 0), 0),
    contract: projects.reduce((s, p) => s + p.contractAmount, 0),
    active: projects.filter((p) => p.status === "Active").length,
  }), [projects, analyses]);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4 md:px-8">
        <div><h1 className="text-xl font-bold">Dashboard</h1><p className="mt-1 text-sm text-gray-500">Construction project overview</p></div>
        <Link href="/projects" className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={17} /> New Project</Link>
      </header>

      <div className="space-y-6 p-5 md:p-8">
        <div><h2 className="text-2xl font-bold">Project Overview</h2><p className="mt-1 text-sm text-gray-500">Monitor budget, spending, and project performance.</p></div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat title="Active Projects" value={String(totals.active)} detail={`${projects.length} total projects`} />
          <Stat title="Contract Value" value={money(totals.contract)} detail="Across all projects" />
          <Stat title="Total Budget" value={money(totals.budget)} detail="Estimated project cost" />
          <Stat title="Actual Cost" value={money(totals.actual)} detail="Recorded spending" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4"><div><h2 className="font-bold">Project Cost Overview</h2><p className="text-sm text-gray-500">Budget compared with actual cost</p></div><Link href="/projects" className="flex items-center gap-1 text-sm font-semibold">View all <ChevronRight size={15} /></Link></div>
            <div className="divide-y divide-gray-100">
              {projects.length === 0 ? <div className="p-8 text-center text-sm text-gray-500">No projects yet. Create your first project.</div> : projects.map((p) => {
                const actual = analyses[p._id]?.actualTotal || 0;
                const progress = Math.min(100, p.budget ? Math.round(actual / p.budget * 100) : 0);
                return <div key={p._id} className="p-5"><div className="flex items-center justify-between"><div><div className="font-semibold">{p.name}</div><div className="text-sm text-gray-500">{p.client}</div></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{progress}% cost used</span></div><div className="mt-4 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${progress}%` }} /></div><div className="mt-4 grid grid-cols-3 gap-3 text-sm"><Metric label="Budget" value={money(p.budget)} /><Metric label="Actual" value={money(actual)} /><Metric label="Remaining" value={money(p.budget - actual)} good={p.budget >= actual} /></div></div>;
              })}
            </div>
          </div>

          <div className="card"><div className="border-b border-gray-100 px-5 py-4"><h2 className="font-bold">Cost Breakdown</h2><p className="text-sm text-gray-500">Current spending across projects</p></div><div className="space-y-5 p-5">{[["Materials", "Material"], ["Labor", "Labor"], ["Equipment", "Equipment"], ["Other Expenses", "Expense"]].map(([label, key]) => { const amount = Object.values(analyses).reduce((s, a) => s + (a.spent[key] || 0), 0); const pct = totals.actual ? amount / totals.actual * 100 : 0; return <CostRow key={label} label={label} pct={pct} amount={amount} />; })}</div></div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5"><h2 className="font-bold">Budget Alerts</h2><p className="mt-1 text-sm text-gray-500">Projects requiring attention</p><div className="mt-5 space-y-3">{projects.filter((p) => (analyses[p._id]?.actualTotal || 0) > p.budget).length === 0 ? <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">No projects are currently over budget.</div> : projects.filter((p) => (analyses[p._id]?.actualTotal || 0) > p.budget).map((p) => <div key={p._id} className="rounded-xl border border-red-100 bg-red-50 p-4"><div className="flex gap-2 font-semibold text-red-800"><AlertTriangle size={17} />{p.name}</div><div className="mt-1 text-sm text-red-700">Actual cost is {money((analyses[p._id]?.actualTotal || 0) - p.budget)} above budget.</div></div>)}</div></div>
          <div className="card p-5"><h2 className="font-bold">Quick Actions</h2><p className="mt-1 text-sm text-gray-500">Common project management tasks</p><div className="mt-5 grid grid-cols-2 gap-3"><Link href="/projects" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50">New Project</Link><Link href="/boq" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50">Add BOQ Item</Link><Link href="/expenses" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50">Record Expense</Link><Link href="/materials" className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold hover:bg-gray-50">Record Purchase</Link></div></div>
        </section>
      </div>
    </main>
  );
}

function Stat({ title, value, detail }: { title: string; value: string; detail: string }) { return <div className="card p-5"><div className="text-sm text-gray-500">{title}</div><div className="stat-number mt-2 text-2xl font-bold">{value}</div><div className="mt-2 text-xs text-gray-500">{detail}</div></div>; }
function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) { return <div><div className="text-gray-500">{label}</div><div className={`font-semibold ${good ? "text-green-600" : ""}`}>{value}</div></div>; }
function CostRow({ label, pct, amount }: { label: string; pct: number; amount: number }) { return <div><div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-semibold">{money(amount)}</span></div><div className="mt-2 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${Math.min(100, pct)}%` }} /></div><div className="mt-1 text-xs text-gray-500">{pct.toFixed(1)}% of actual cost</div></div>; }

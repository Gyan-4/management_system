"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, AlertTriangle, Plus, Trash2, X } from "lucide-react";

type Project = { _id: string; name: string; contractAmount: number };
type RecordItem = { _id: string; progressDate: string; percentage: number; milestone: string; notes: string };
type Analysis = { actualTotal: number; physicalProgress: number; financialProgress: number; budgetUtilization: number; progressGap: number; progressStatus: string };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

export default function ProgressPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ progressDate: new Date().toISOString().slice(0, 10), percentage: "0", milestone: "", notes: "" });

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (list[0]) setProjectId(list[0]._id);
      });
  }, []);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/progress?projectId=${projectId}`).then(r => r.json()),
      fetch(`/api/cost-analysis?projectId=${projectId}`).then(r => r.json()),
    ])
      .then(([recordsData, analysisData]) => {
        setRecords(Array.isArray(recordsData) ? recordsData : []);
        setAnalysis(analysisData?.error ? null : analysisData);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId }),
      });
      if (!response.ok) return;
      const item = await response.json();
      setRecords(previous => [item, ...previous]);
      setAnalysis(previous => previous ? {
        ...previous,
        physicalProgress: item.percentage,
        progressGap: previous.financialProgress - item.percentage,
        progressStatus: previous.financialProgress - item.percentage > 10
          ? "Spending is ahead of physical progress"
          : previous.financialProgress - item.percentage < -10
            ? "Physical progress is ahead of spending"
            : "Progress and spending are aligned",
      } : previous);
      setOpen(false);
      setForm({ progressDate: new Date().toISOString().slice(0, 10), percentage: String(item.percentage), milestone: "", notes: "" });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    const response = await fetch(`/api/progress/${id}`, { method: "DELETE" });
    if (response.ok) setRecords(previous => previous.filter(item => item._id !== id));
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">Monitoring</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Project Progress</h1>
            <p className="mt-1 text-sm text-slate-500">Track physical work progress against actual project spending.</p>
          </div>
          <button type="button" disabled={!projectId} onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            <Plus size={17} /> Record Progress
          </button>
        </div>

        <div className="card mb-5 p-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Project</label>
          <select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm sm:max-w-xl">
            <option value="">Select a project</option>
            {projects.map(project => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>
        </div>

        {loading && <div className="card p-10 text-center text-sm text-slate-500">Loading project control data...</div>}

        {!loading && analysis && (
          <>
            <div className="grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
              <Metric label="Physical Progress" value={`${analysis.physicalProgress.toFixed(1)}%`} />
              <Metric label="Financial Progress" value={`${analysis.financialProgress.toFixed(1)}%`} />
              <Metric label="Budget Utilization" value={`${analysis.budgetUtilization.toFixed(1)}%`} />
              <Metric label="Actual Cost" value={money(analysis.actualTotal)} />
            </div>

            <div className={`mt-5 border p-5 ${analysis.progressGap > 10 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
              <div className="flex items-start gap-3">
                {analysis.progressGap > 10 ? <AlertTriangle className="mt-0.5 text-red-600" size={19} /> : <Activity className="mt-0.5 text-blue-600" size={19} />}
                <div>
                  <div className="text-sm font-bold">{analysis.progressStatus}</div>
                  <p className="mt-1 text-xs text-slate-500">
                    Financial progress is {analysis.progressGap >= 0 ? `${analysis.progressGap.toFixed(1)} points ahead of` : `${Math.abs(analysis.progressGap).toFixed(1)} points behind`} physical progress.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {!loading && (
          <div className="card mt-5 overflow-x-auto">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-bold">Progress Records</h2>
              <p className="mt-1 text-xs text-slate-500">Historical physical progress entries for the selected project.</p>
            </div>
            {records.length > 0 ? (
              <table className="data-table min-w-[750px] text-sm">
                <thead><tr><th>Date</th><th>Progress</th><th>Milestone</th><th>Notes</th><th /></tr></thead>
                <tbody>
                  {records.map(item => (
                    <tr key={item._id}>
                      <td>{new Date(item.progressDate).toLocaleDateString("en-PH")}</td>
                      <td className="font-bold">{item.percentage}%</td>
                      <td>{item.milestone || "—"}</td>
                      <td>{item.notes || "—"}</td>
                      <td><button type="button" onClick={() => del(item._id)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label="Delete progress record"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">No progress records yet.</div>
            )}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form onSubmit={add} className="w-full max-w-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Record Project Progress</h2><p className="mt-1 text-xs text-slate-500">Enter the latest physical work completion.</p></div>
              <button type="button" onClick={() => setOpen(false)} className="p-2 text-slate-400 hover:text-slate-700" aria-label="Close"><X size={19} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <Field label="Date" type="date" value={form.progressDate} onChange={value => setForm({ ...form, progressDate: value })} />
              <Field label="Physical Progress (%)" type="number" value={form.percentage} onChange={value => setForm({ ...form, percentage: value })} />
              <Field label="Milestone" value={form.milestone} onChange={value => setForm({ ...form, milestone: value })} />
              <label className="block"><span className="text-sm font-medium">Notes</span><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Progress"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-5"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-xl font-bold tabular-nums">{value}</div></div>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="text-sm font-medium">{label}</span><input required type={type} min={type === "number" ? 0 : undefined} max={type === "number" ? 100 : undefined} step={type === "number" ? 0.1 : undefined} value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm" /></label>;
}

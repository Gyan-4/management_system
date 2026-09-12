"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarDays, Pencil, Plus, Trash2, X } from "lucide-react";

type Project = { _id: string; name: string; client: string; location?: string; contractAmount: number; budget: number; startDate: string; endDate: string; status: string; projectManager?: string; description?: string };
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const emptyForm = { name: "", client: "", location: "", contractAmount: "", budget: "", startDate: "", endDate: "", status: "Planning", projectManager: "", description: "" };

async function responseError(response: Response, fallback: string) { try { const data = await response.json(); return data?.error || fallback; } catch { return fallback; } }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function loadProjects() {
    setLoading(true);
    try {
      const r = await fetch("/api/projects", { cache: "no-store" });
      if (!r.ok) throw new Error(await responseError(r, "Could not load projects."));
      const result = await r.json();
      setProjects(Array.isArray(result) ? result : []);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load projects. Check your MongoDB connection."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadProjects(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setError(""); setOpen(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({ name: p.name, client: p.client, location: p.location || "", contractAmount: String(p.contractAmount), budget: String(p.budget), startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), status: p.status, projectManager: p.projectManager || "", description: p.description || "" });
    setError(""); setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const contract = Number(form.contractAmount), budget = Number(form.budget);
    if (!form.name.trim() || !form.client.trim()) { setError("Project name and client are required."); setSaving(false); return; }
    if (!Number.isFinite(contract) || !Number.isFinite(budget) || contract < 0 || budget < 0) { setError("Contract amount and budget cannot be negative."); setSaving(false); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required."); setSaving(false); return; }
    if (form.endDate < form.startDate) { setError("End date cannot be earlier than start date."); setSaving(false); return; }
    if (budget > contract) { setError("Estimated budget should not exceed the contract amount."); setSaving(false); return; }
    try {
      const r = await fetch(editing ? `/api/projects/${editing._id}` : "/api/projects", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, contractAmount: contract, budget }) });
      if (!r.ok) throw new Error(await responseError(r, editing ? "Could not update the project." : "Could not create the project."));
      setForm(emptyForm); setOpen(false); setEditing(null); await loadProjects();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save project."); }
    finally { setSaving(false); }
  }

  async function removeProject(p: Project) {
    if (!window.confirm(`Delete project “${p.name}”? This will also delete its BOQ, cost records, and progress records.`)) return;
    setError("");
    try {
      const r = await fetch(`/api/projects/${p._id}`, { method: "DELETE" });
      if (!r.ok) { setError(await responseError(r, "Could not delete the project.")); return; }
      await loadProjects();
    } catch { setError("Could not delete the project. Check your connection and try again."); }
  }

  const totals = useMemo(() => ({
    contract: projects.reduce((s, p) => s + Number(p.contractAmount || 0), 0),
    budget: projects.reduce((s, p) => s + Number(p.budget || 0), 0),
    active: projects.filter(p => p.status === "Active").length,
    planning: projects.filter(p => p.status === "Planning").length,
  }), [projects]);

  return <main className="p-5 md:p-8"><div className="mx-auto max-w-[1500px]">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Project Register</div><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Projects</h1><p className="mt-1 text-sm text-slate-500">Project records, contract values, budgets and schedules.</p></div><button onClick={openCreate} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={16}/> New Project</button></div>
    {error && !open && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mt-6 grid grid-cols-2 border border-slate-200 bg-slate-200 sm:grid-cols-4"><Stat label="Total Projects" value={String(projects.length)}/><Stat label="Active" value={String(totals.active)}/><Stat label="Planning" value={String(totals.planning)}/><Stat label="Contract Value" value={money(totals.contract)}/></div>
    <section className="mt-6 overflow-hidden border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold text-slate-900">Project Control Register</h2><p className="mt-1 text-xs text-slate-500">Manage project records and continue into estimating, cost control and progress monitoring.</p></div>{loading?<div className="p-12 text-center text-sm text-slate-500">Loading projects...</div>:projects.length===0?<div className="p-14 text-center"><Building2 className="mx-auto text-slate-300" size={38}/><h2 className="mt-4 font-semibold">No projects recorded</h2><p className="mt-1 text-sm text-slate-500">Create a project before preparing a BOQ or recording costs.</p></div>:<div className="overflow-x-auto"><table className="data-table min-w-[1180px]"><thead><tr><th>Project</th><th>Client / Location</th><th>Status</th><th>Schedule</th><th className="text-right">Contract</th><th className="text-right">Budget</th><th className="text-right">Budget Margin</th><th></th></tr></thead><tbody>{projects.map(p=>{const margin=Number(p.contractAmount||0)-Number(p.budget||0);return <tr key={p._id}><td><div className="font-bold text-slate-900">{p.name}</div><div className="mt-1 text-[11px] text-slate-500">Engineer: {p.projectManager||"—"}</div></td><td><div className="font-semibold text-slate-700">{p.client}</div>{p.location&&<div className="mt-1 text-[11px] text-slate-500">{p.location}</div>}</td><td><span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{p.status}</span></td><td><div className="flex items-center gap-1 text-xs text-slate-600"><CalendarDays size={13}/>{new Date(p.startDate).toLocaleDateString()} — {new Date(p.endDate).toLocaleDateString()}</div></td><td className="text-right font-semibold tabular-nums">{money(Number(p.contractAmount||0))}</td><td className="text-right font-semibold tabular-nums">{money(Number(p.budget||0))}</td><td className={`text-right font-semibold tabular-nums ${margin<0?"text-red-600":"text-emerald-700"}`}>{money(margin)}</td><td><div className="flex justify-end gap-1"><button aria-label={`Edit ${p.name}`} onClick={()=>openEdit(p)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button><button aria-label={`Delete ${p.name}`} onClick={()=>removeProject(p)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button><Link href={`/cost-analysis?projectId=${p._id}`} className="inline-flex items-center gap-1 px-2 text-xs font-bold text-blue-600 hover:text-blue-800">Control <ArrowRight size={13}/></Link></div></td></tr>})}</tbody></table></div>}</section>
  </div>
  {open&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4"><div><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Project Setup</div><h2 className="mt-1 text-lg font-bold">{editing?"Edit Project":"Create Project"}</h2></div><button type="button" onClick={()=>setOpen(false)} className="p-2 hover:bg-slate-100"><X size={19}/></button></div>{error&&<div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Project Name" required value={form.name} onChange={v=>setForm({...form,name:v})}/><Field label="Client" required value={form.client} onChange={v=>setForm({...form,client:v})}/><Field label="Location" value={form.location} onChange={v=>setForm({...form,location:v})}/><Field label="Project Engineer / Manager" value={form.projectManager} onChange={v=>setForm({...form,projectManager:v})}/><Field label="Contract Amount" required type="number" min="0" value={form.contractAmount} onChange={v=>setForm({...form,contractAmount:v})}/><Field label="Estimated Budget" required type="number" min="0" value={form.budget} onChange={v=>setForm({...form,budget:v})}/><Field label="Start Date" required type="date" value={form.startDate} onChange={v=>setForm({...form,startDate:v})}/><Field label="End Date" required type="date" value={form.endDate} onChange={v=>setForm({...form,endDate:v})}/><label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"><option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option></select></label><label className="block sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"/></label></div><div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4"><button type="button" onClick={()=>setOpen(false)} className="border border-slate-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":editing?"Save Changes":"Create Project"}</button></div></form></div>}</main>;
}

function Stat({label,value}:{label:string;value:string}){return <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1.5 text-lg font-bold tabular-nums">{value}</div></div>}
function Field({label,value,onChange,type="text",required=false,min}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean;min?:string}){return <label className="block"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}{required&&" *"}</span><input required={required} min={min} type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"/></label>}

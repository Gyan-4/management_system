"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Receipt, Users, Truck, Trash2 } from "lucide-react";

type Project = { _id: string; name: string };
type Entry = { _id: string; date: string; description?: string; employeeName?: string; role?: string; hours?: number; hourlyRate?: number; equipmentName?: string; ratePerHour?: number; category?: string; amount?: number; operator?: string; reference?: string };
type Tab = "labor" | "equipment" | "expenses";
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);

export default function CostsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [tab, setTab] = useState<Tab>("labor");
  const [rows, setRows] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Could not load projects."); return r.json(); })
      .then(d => { const list = Array.isArray(d) ? d : []; setProjects(list); if (list[0]) setProjectId(list[0]._id); })
      .catch(e => setError(e instanceof Error ? e.message : "Could not load projects."));
  }, []);

  useEffect(() => {
    if (!projectId) { setRows([]); return; }
    setError("");
    fetch(`/api/${tab}?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" })
      .then(async r => { if (!r.ok) throw new Error("Could not load cost records."); return r.json(); })
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(e => setError(e instanceof Error ? e.message : "Could not load cost records."));
  }, [projectId, tab]);

  const rowCost = (r: Entry) => tab === "labor" ? Number(r.hours || 0) * Number(r.hourlyRate || 0) : tab === "equipment" ? Number(r.hours || 0) * Number(r.ratePerHour || 0) : Number(r.amount || 0);
  const total = useMemo(() => rows.reduce((s, r) => s + rowCost(r), 0), [rows, tab]);

  function defaults(): Record<string, string> {
    const date = new Date().toISOString().slice(0, 10);
    if (tab === "labor") return { date, employeeName: "", role: "Worker", hours: "8", hourlyRate: "0" };
    if (tab === "equipment") return { date, equipmentName: "", hours: "1", ratePerHour: "0", operator: "" };
    return { date, category: "Other", description: "", amount: "0", reference: "" };
  }

  function add() { setForm(defaults()); setError(""); setOpen(true); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const numeric = ["hours", "hourlyRate", "ratePerHour", "amount"];
      const payload: Record<string, string | number> = { ...form, projectId };
      for (const key of numeric) if (key in payload) payload[key] = Number(payload[key]);
      if (tab === "labor" && (!String(form.employeeName || "").trim() || Number(form.hours) < 0 || Number(form.hourlyRate) < 0)) throw new Error("Enter a worker and valid non-negative hours and rate.");
      if (tab === "equipment" && (!String(form.equipmentName || "").trim() || Number(form.hours) < 0 || Number(form.ratePerHour) < 0)) throw new Error("Enter equipment and valid non-negative hours and rate.");
      if (tab === "expenses" && (!String(form.description || "").trim() || Number(form.amount) < 0)) throw new Error("Enter a description and valid non-negative amount.");
      const r = await fetch(`/api/${tab}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not save entry.");
      setRows(x => [d, ...x]); setOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save entry."); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this cost entry?")) return;
    try {
      const r = await fetch(`/api/${tab}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Could not delete entry.");
      setRows(x => x.filter(v => v._id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete entry."); }
  }

  return <main className="min-h-screen p-5 md:p-8"><div className="mx-auto max-w-[1500px]">
    <header className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Cost Ledger</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Actual Project Costs</h1><p className="mt-1 text-sm text-slate-500">Track labor, equipment usage and other project expenses.</p></div><button onClick={add} disabled={!projectId} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={17}/> Record Cost</button></header>
    {error && <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mb-5 flex flex-col gap-2 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</label><select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border border-slate-300 px-3 py-2.5 text-sm sm:max-w-xl"><option value="">Select a project</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
    <div className="mb-5 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-3">{([["labor","Labor",Users],["equipment","Equipment",Truck],["expenses","Other Expenses",Receipt]] as const).map(([key,label,Icon]) => <button key={key} onClick={() => setTab(key)} className={`bg-white p-5 text-left ${tab === key ? "ring-2 ring-inset ring-blue-600" : ""}`}><Icon size={18} className="text-slate-500"/><div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-lg font-bold">{tab === key ? money(total) : "Open register"}</div></button>)}</div>
    <section className="overflow-x-auto border border-slate-200 bg-white"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">{tab === "labor" ? "Labor" : tab === "equipment" ? "Equipment Usage" : "Other Expenses"} Register</h2><p className="mt-1 text-xs text-slate-500">{rows.length} records · {money(total)}</p></div><table className="data-table min-w-[850px]"><thead><tr><th>Date</th><th>Description</th><th>Details</th><th className="text-right">Cost</th><th></th></tr></thead><tbody>{rows.map(r => <tr key={r._id}><td>{new Date(r.date).toLocaleDateString()}</td><td className="font-semibold">{r.description || r.employeeName || r.equipmentName || "—"}</td><td className="text-slate-500">{tab === "labor" ? `${r.role || "Worker"} · ${r.hours || 0} hrs · ${money(r.hourlyRate || 0)}/hr` : tab === "equipment" ? `${r.operator || "No operator"} · ${r.hours || 0} hrs · ${money(r.ratePerHour || 0)}/hr` : `${r.category || "Other"} · ${r.reference || "No reference"}`}</td><td className="text-right font-bold tabular-nums">{money(rowCost(r))}</td><td className="text-right"><button onClick={() => remove(r._id)} className="p-1.5 text-slate-400 hover:text-red-600" aria-label="Delete cost entry"><Trash2 size={15}/></button></td></tr>)}</tbody>{rows.length > 0 && <tfoot><tr><td colSpan={3} className="text-right font-bold">TOTAL</td><td className="text-right font-bold">{money(total)}</td><td/></tr></tfoot>}</table>{rows.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No records for this project.</div>}</section>
    {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={submit} className="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-slate-200 bg-white shadow-2xl"><div className="border-b border-slate-200 px-6 py-5"><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Cost Entry</div><h2 className="mt-1 text-xl font-bold">Record {tab === "labor" ? "Labor" : tab === "equipment" ? "Equipment Usage" : "Expense"}</h2></div><div className="grid gap-4 p-6 sm:grid-cols-2">{Object.entries(form).map(([k,v]) => <label key={k}><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{k.replace(/([A-Z])/g, " $1")}</span><input required={k !== "operator" && k !== "reference"} type={k === "date" ? "date" : ["hours","hourlyRate","ratePerHour","amount"].includes(k) ? "number" : "text"} min={["hours","hourlyRate","ratePerHour","amount"].includes(k) ? "0" : undefined} step={["hours","hourlyRate","ratePerHour","amount"].includes(k) ? "any" : undefined} value={v} onChange={e => setForm({ ...form, [k]: e.target.value })} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"/></label>)}</div><div className="mx-6 mb-2 flex justify-between border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span>Calculated Cost</span><b>{money(tab === "labor" ? (Number(form.hours)||0)*(Number(form.hourlyRate)||0) : tab === "equipment" ? (Number(form.hours)||0)*(Number(form.ratePerHour)||0) : Number(form.amount)||0)}</b></div><div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setOpen(false)} className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Entry"}</button></div></form></div>}
  </div></main>;
}

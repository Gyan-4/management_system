"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Project = { _id: string; name: string; budget: number };
type Item = { _id: string; itemNo: string; description: string; category: string; unit: string; quantity: number; unitCost: number; totalCost?: number; notes?: string };
const categories = ["Materials", "Labor", "Equipment", "Other"];
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);
const emptyForm = { itemNo: "", description: "", category: "Materials", unit: "pcs", quantity: "1", unitCost: "0", notes: "" };

export default function BOQPage() {
  const [projects, setProjects] = useState<Project[]>([]), [projectId, setProjectId] = useState(""), [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(emptyForm), [editingId, setEditingId] = useState<string | null>(null), [open, setOpen] = useState(false), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");

  useEffect(() => { fetch("/api/projects").then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(data => { setProjects(Array.isArray(data) ? data : []); if (data[0]) setProjectId(data[0]._id); }).catch(() => setError("Could not load projects.")); }, []);
  useEffect(() => {
    if (!projectId) { setItems([]); return; }
    setLoading(true); setError("");
    fetch(`/api/boq?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not load BOQ items."); return d; }).then(d => setItems(Array.isArray(d) ? d : [])).catch(e => setError(e instanceof Error ? e.message : "Could not load BOQ items.")).finally(() => setLoading(false));
  }, [projectId]);

  const amount = (i: Item) => typeof i.totalCost === "number" ? i.totalCost : Number(i.quantity || 0) * Number(i.unitCost || 0);
  const total = useMemo(() => items.reduce((s, i) => s + amount(i), 0), [items]);
  const selected = projects.find(p => p._id === projectId);
  const byCategory = useMemo(() => categories.map(c => ({ c, v: items.filter(i => i.category === c).reduce((s, i) => s + amount(i), 0) })), [items]);
  const nextItemNo = useMemo(() => String(items.map(i => Number(i.itemNo)).filter(n => Number.isFinite(n) && n > 0).reduce((m, n) => Math.max(m, n), 0) + 1), [items]);

  function add() { setEditingId(null); setForm({ ...emptyForm, itemNo: nextItemNo }); setError(""); setOpen(true); }
  function edit(i: Item) { setEditingId(i._id); setForm({ itemNo: i.itemNo, description: i.description, category: i.category, unit: i.unit, quantity: String(i.quantity), unitCost: String(i.unitCost), notes: i.notes || "" }); setError(""); setOpen(true); }

  async function save(e: FormEvent) {
    e.preventDefault(); if (!projectId) return; setSaving(true); setError("");
    const quantity = Number(form.quantity), unitCost = Number(form.unitCost);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) { setError("Quantity and unit rate must be valid non-negative numbers."); setSaving(false); return; }
    if (items.some(i => i.itemNo.trim().toLowerCase() === form.itemNo.trim().toLowerCase() && i._id !== editingId)) { setError("That item number already exists in this project."); setSaving(false); return; }
    try {
      const r = await fetch(editingId ? `/api/boq/${editingId}` : "/api/boq", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, projectId, quantity, unitCost }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not save BOQ item.");
      setItems(p => editingId ? p.map(i => i._id === editingId ? d : i) : [...p, d]); setOpen(false); setEditingId(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save BOQ item."); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this BOQ item? This cannot be undone.")) return;
    try { const r = await fetch(`/api/boq/${id}`, { method: "DELETE" }); const d = await r.json(); if (!r.ok) throw new Error(d.error || "Could not delete BOQ item."); setItems(p => p.filter(i => i._id !== id)); } catch (e) { setError(e instanceof Error ? e.message : "Could not delete BOQ item."); }
  }

  return <main className="p-5 md:p-8"><div className="mx-auto max-w-[1500px]">
    <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Estimating Worksheet</div><h1 className="mt-1 text-2xl font-bold">Bill of Quantities</h1><p className="mt-1 text-sm text-slate-500">Prepare quantities, unit rates and planned project cost.</p></div><button disabled={!projectId} onClick={add} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={16}/> Add BOQ Item</button></header>
    {error && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <div className="mt-5 flex flex-col gap-2 border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</span><select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full border border-slate-300 px-3 py-2.5 text-sm sm:max-w-xl"><option value="">Select a project</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
    <div className="mt-5 grid grid-cols-2 border border-slate-200 bg-slate-200 md:grid-cols-5"><Stat label="BOQ Estimate" value={money(total)}/>{byCategory.map(x => <Stat key={x.c} label={x.c} value={money(x.v)}/>)}</div>
    {selected && <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border border-slate-200 bg-white px-5 py-4 text-sm"><span>Budget <b>{money(selected.budget)}</b></span><span>BOQ / Budget <b>{selected.budget ? (total / selected.budget * 100).toFixed(1) : "0.0"}%</b></span><span>Remaining <b className={selected.budget-total<0?"text-red-600":"text-emerald-700"}>{money(selected.budget-total)}</b></span></div>}
    <section className="mt-5 overflow-x-auto border border-slate-200 bg-white">{loading ? <div className="p-12 text-center text-sm text-slate-500">Loading BOQ...</div> : <table className="data-table min-w-[1000px]"><thead><tr><th>Item No.</th><th>Description</th><th>Category</th><th>Unit</th><th className="text-right">Quantity</th><th className="text-right">Unit Rate</th><th className="text-right">Amount</th><th className="text-right">Actions</th></tr></thead><tbody>{items.map(i => <tr key={i._id}><td className="font-mono text-xs">{i.itemNo}</td><td className="font-semibold">{i.description}</td><td>{i.category}</td><td>{i.unit}</td><td className="text-right tabular-nums">{i.quantity}</td><td className="text-right tabular-nums">{money(i.unitCost)}</td><td className="text-right font-bold tabular-nums">{money(amount(i))}</td><td><div className="flex justify-end"><button onClick={()=>edit(i)} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={15}/></button><button onClick={()=>remove(i._id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15}/></button></div></td></tr>)}</tbody>{items.length>0&&<tfoot><tr><td colSpan={6} className="text-right font-bold">TOTAL ESTIMATE</td><td className="text-right font-bold">{money(total)}</td><td/></tr></tfoot>}</table>}{!loading&&items.length===0&&<div className="p-12 text-center text-sm text-slate-500">No BOQ items recorded for this project.</div>}</section>
    {open&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl"><div className="border-b border-slate-200 px-6 py-5"><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Estimate Line Item</div><h2 className="mt-1 text-xl font-bold">{editingId?"Edit BOQ Item":"Add BOQ Item"}</h2></div><div className="grid gap-4 p-6 sm:grid-cols-2"><Field label="Item No." required value={form.itemNo} onChange={v=>setForm({...form,itemNo:v})}/><Field label="Description" required value={form.description} onChange={v=>setForm({...form,description:v})}/><label><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Category *</span><select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm">{categories.map(c=><option key={c}>{c}</option>)}</select></label><Field label="Unit" required value={form.unit} onChange={v=>setForm({...form,unit:v})}/><Field label="Quantity" required type="number" min="0" step="any" value={form.quantity} onChange={v=>setForm({...form,quantity:v})}/><Field label="Unit Rate" required type="number" min="0" step="any" value={form.unitCost} onChange={v=>setForm({...form,unitCost:v})}/><label className="sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm"/></label></div><div className="mx-6 mb-2 border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm">Line Amount <b className="ml-2">{money((Number(form.quantity)||0)*(Number(form.unitCost)||0))}</b></div><div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={()=>setOpen(false)} className="border border-slate-300 bg-white px-4 py-2.5 text-sm">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?"Saving...":editingId?"Save Changes":"Add Item"}</button></div></form></div>}
  </div></main>;
}
function Stat({label,value}:{label:string;value:string}){return <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1.5 text-lg font-bold tabular-nums">{value}</div></div>}
function Field({label,value,onChange,type="text",required=false,min,step}:{label:string;value:string;onChange:(v:string)=>void;type?:string;required?:boolean;min?:string;step?:string}){return <label><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}{required&&" *"}</span><input required={required} min={min} step={step} type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm"/></label>}

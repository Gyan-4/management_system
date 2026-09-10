"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";

type Project = { _id: string; name: string; budget: number };
type Item = { _id: string; itemNo: string; description: string; category: string; unit: string; quantity: number; unitCost: number };

const categories = ["Materials", "Labor", "Equipment", "Other"];
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);
const initial = { itemNo: "", description: "", category: "Materials", unit: "pcs", quantity: "1", unitCost: "0", notes: "" };

export default function BOQPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState(initial);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(data => { setProjects(data); if (data[0]) setProjectId(data[0]._id); }); }, []);
  useEffect(() => { if (!projectId) return; setLoading(true); fetch(`/api/boq?projectId=${projectId}`).then(r => r.json()).then(setItems).finally(() => setLoading(false)); }, [projectId]);

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unitCost, 0), [items]);
  const byCategory = useMemo(() => categories.map(category => ({ category, total: items.filter(i => i.category === category).reduce((s, i) => s + i.quantity * i.unitCost, 0) })), [items]);
  const selected = projects.find(p => p._id === projectId);

  async function addItem(e: FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/boq", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, projectId }) });
    if (response.ok) { const item = await response.json(); setItems(prev => [...prev, item]); setForm({ ...initial, itemNo: String(items.length + 2) }); setOpen(false); }
  }

  async function removeItem(id: string) {
    const response = await fetch(`/api/boq/${id}`, { method: "DELETE" });
    if (response.ok) setItems(prev => prev.filter(i => i._id !== id));
  }

  return <main className="min-h-screen bg-gray-50 p-5 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold">BOQ & Cost Estimation</h1><p className="mt-1 text-sm text-gray-500">Build the bill of quantities and calculate the project estimate.</p></div><button disabled={!projectId} onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={17}/> Add BOQ Item</button></div>
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4"><label className="text-sm font-semibold">Project</label><select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:max-w-xl"><option value="">Select a project</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Card label="BOQ Estimate" value={money(total)} icon={<Calculator size={18}/>}/><Card label="Materials" value={money(byCategory[0].total)}/><Card label="Labor" value={money(byCategory[1].total)}/><Card label="Equipment" value={money(byCategory[2].total)}/><Card label="Other" value={money(byCategory[3].total)}/></div>
    {selected && <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4 text-sm"><span className="text-gray-500">Project Budget:</span> <b>{money(selected.budget)}</b><span className="mx-3 text-gray-300">|</span><span className="text-gray-500">Remaining:</span> <b className={selected.budget - total < 0 ? "text-red-600" : "text-green-600"}>{money(selected.budget - total)}</b></div>}
    <div className="mt-5 overflow-x-auto rounded-xl border border-gray-200 bg-white">{loading ? <div className="p-10 text-center text-sm text-gray-500">Loading BOQ...</div> : <table className="w-full min-w-[850px] text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Unit Cost</th><th className="px-4 py-3 text-right">Total</th><th></th></tr></thead><tbody className="divide-y divide-gray-100">{items.map(i => <tr key={i._id}><td className="px-4 py-3">{i.itemNo}</td><td className="px-4 py-3 font-medium">{i.description}</td><td className="px-4 py-3">{i.category}</td><td className="px-4 py-3">{i.unit}</td><td className="px-4 py-3 text-right">{i.quantity}</td><td className="px-4 py-3 text-right">{money(i.unitCost)}</td><td className="px-4 py-3 text-right font-semibold">{money(i.quantity * i.unitCost)}</td><td className="px-4 py-3"><button onClick={() => removeItem(i._id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody>{items.length > 0 && <tfoot className="border-t bg-gray-50"><tr><td colSpan={6} className="px-4 py-4 text-right font-bold">TOTAL ESTIMATED COST</td><td className="px-4 py-4 text-right text-lg font-bold">{money(total)}</td><td/></tr></tfoot>}</table>}{!loading && items.length === 0 && <div className="p-12 text-center text-sm text-gray-500">No BOQ items for this project.</div>}</div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={addItem} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold">Add BOQ Item</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Item No." value={form.itemNo} onChange={v => setForm({...form,itemNo:v})}/><Field label="Description" required value={form.description} onChange={v => setForm({...form,description:v})}/><label><span className="text-sm font-medium">Category</span><select value={form.category} onChange={e => setForm({...form,category:e.target.value})} className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm">{categories.map(c=><option key={c}>{c}</option>)}</select></label><Field label="Unit" required value={form.unit} onChange={v => setForm({...form,unit:v})}/><Field label="Quantity" required type="number" value={form.quantity} onChange={v => setForm({...form,quantity:v})}/><Field label="Unit Cost" required type="number" value={form.unitCost} onChange={v => setForm({...form,unitCost:v})}/></div><div className="mt-5 rounded-lg bg-gray-50 p-4 text-right"><span className="text-sm text-gray-500">Estimated line cost </span><b>{money((Number(form.quantity)||0)*(Number(form.unitCost)||0))}</b></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button><button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Add Item</button></div></form></div>}
  </div></main>;
}
function Card({label,value,icon}:{label:string,value:string,icon?:React.ReactNode}){return <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-center gap-2 text-sm text-gray-500">{icon}{label}</div><div className="mt-2 text-xl font-bold">{value}</div></div>}
function Field({label,value,onChange,type="text",required=false}:{label:string,value:string,onChange:(v:string)=>void,type?:string,required?:boolean}){return <label><span className="text-sm font-medium">{label}{required&&" *"}</span><input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"/></label>}

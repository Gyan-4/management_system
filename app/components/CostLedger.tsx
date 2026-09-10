"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type CostCategory = "Material" | "Labor" | "Equipment" | "Expense";
type Project = { _id: string; name: string };
type Entry = { _id: string; description: string; quantity: number; unit: string; unitCost: number; amount: number; date: string; supplierOrEmployee: string; referenceNo: string; notes: string };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);

export default function CostLedger({ category, title, description }: { category: CostCategory; title: string; description: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ description: "", quantity: "1", unit: category === "Material" ? "pcs" : category === "Labor" ? "day" : category === "Equipment" ? "day" : "lot", unitCost: "0", amount: "0", date: new Date().toISOString().slice(0, 10), supplierOrEmployee: "", referenceNo: "", notes: "" });

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(data => { setProjects(data); if (data[0]) setProjectId(data[0]._id); }); }, []);
  useEffect(() => { if (!projectId) return; setLoading(true); fetch(`/api/costs?projectId=${projectId}&category=${category}`).then(r => r.json()).then(setEntries).finally(() => setLoading(false)); }, [projectId, category]);

  const total = useMemo(() => entries.reduce((sum, e) => sum + e.amount, 0), [entries]);
  const calculated = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);

  async function addEntry(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    const response = await fetch("/api/costs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, projectId, category }) });
    if (response.ok) { const item = await response.json(); setEntries(prev => [item, ...prev]); setOpen(false); setForm({ ...form, description: "", quantity: "1", unitCost: "0", amount: "0", referenceNo: "", notes: "" }); }
  }

  async function removeEntry(id: string) {
    const response = await fetch(`/api/costs/${id}`, { method: "DELETE" });
    if (response.ok) setEntries(prev => prev.filter(e => e._id !== id));
  }

  return <main className="min-h-screen bg-gray-50 p-5 md:p-8"><div className="mx-auto max-w-7xl">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-gray-500">{description}</p></div><button disabled={!projectId} onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Plus size={17}/> Add Entry</button></div>
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4"><label className="text-sm font-semibold">Project</label><select value={projectId} onChange={e => setProjectId(e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:max-w-xl"><option value="">Select a project</option>{projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}</select></div>
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">Total {title}</p><p className="mt-1 text-2xl font-bold">{money(total)}</p><p className="mt-1 text-xs text-gray-400">{entries.length} recorded {entries.length === 1 ? "entry" : "entries"}</p></div>
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">{loading ? <div className="p-10 text-center text-sm text-gray-500">Loading...</div> : <table className="w-full min-w-[950px] text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Supplier / Employee</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3 text-right">Unit Cost</th><th className="px-4 py-3 text-right">Amount</th><th></th></tr></thead><tbody className="divide-y divide-gray-100">{entries.map(e => <tr key={e._id}><td className="px-4 py-3 whitespace-nowrap">{new Date(e.date).toLocaleDateString("en-PH")}</td><td className="px-4 py-3 font-medium">{e.description}</td><td className="px-4 py-3">{e.supplierOrEmployee || "—"}</td><td className="px-4 py-3">{e.referenceNo || "—"}</td><td className="px-4 py-3 text-right">{e.quantity}</td><td className="px-4 py-3">{e.unit}</td><td className="px-4 py-3 text-right">{money(e.unitCost)}</td><td className="px-4 py-3 text-right font-semibold">{money(e.amount)}</td><td className="px-4 py-3"><button onClick={() => removeEntry(e._id)} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody>{entries.length > 0 && <tfoot className="border-t bg-gray-50"><tr><td colSpan={7} className="px-4 py-4 text-right font-bold">TOTAL</td><td className="px-4 py-4 text-right text-lg font-bold">{money(total)}</td><td/></tr></tfoot>}</table>}{!loading && entries.length === 0 && <div className="p-12 text-center text-sm text-gray-500">No {title.toLowerCase()} entries for this project.</div>}</div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={addEntry} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-xl font-bold">Add {title.slice(0, -1)} Entry</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Description" required value={form.description} onChange={v=>setForm({...form,description:v})}/><Field label="Date" required type="date" value={form.date} onChange={v=>setForm({...form,date:v})}/><Field label={category === "Labor" ? "Employee" : category === "Material" ? "Supplier" : "Supplier / Provider"} value={form.supplierOrEmployee} onChange={v=>setForm({...form,supplierOrEmployee:v})}/><Field label="Reference No." value={form.referenceNo} onChange={v=>setForm({...form,referenceNo:v})}/>{category !== "Expense" ? <><Field label="Quantity" required type="number" value={form.quantity} onChange={v=>setForm({...form,quantity:v})}/><Field label="Unit" required value={form.unit} onChange={v=>setForm({...form,unit:v})}/><Field label="Unit Cost" required type="number" value={form.unitCost} onChange={v=>setForm({...form,unitCost:v})}/></> : <Field label="Amount" required type="number" value={form.amount} onChange={v=>setForm({...form,amount:v})}/>}<label className="sm:col-span-2"><span className="text-sm font-medium">Notes</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"/></label></div>{category !== "Expense" && <div className="mt-5 rounded-lg bg-gray-50 p-4 text-right text-sm"><span className="text-gray-500">Calculated amount </span><b>{money(calculated)}</b></div>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2.5 text-sm font-semibold">Cancel</button><button className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">Save Entry</button></div></form></div>}
  </div></main>;
}
function Field({label,value,onChange,type="text",required=false}:{label:string,value:string,onChange:(v:string)=>void,type?:string,required?:boolean}){return <label><span className="text-sm font-medium">{label}{required&&" *"}</span><input required={required} type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"/></label>}

"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useProject } from "./ProjectContext";

export type CostCategory = "Material" | "Labor" | "Equipment" | "Expense";
type Project = { _id: string; name: string };
type Entry = { _id: string; description: string; quantity: number; unit: string; unitCost: number; amount: number; date: string; supplierOrEmployee: string; referenceNo: string; notes: string; category?: CostCategory };

type FormState = { description: string; quantity: string; unit: string; unitCost: string; amount: string; date: string; supplierOrEmployee: string; referenceNo: string; notes: string };
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);

function defaultForm(category: CostCategory): FormState {
  return { description: "", quantity: "1", unit: category === "Material" ? "pcs" : category === "Labor" ? "day" : category === "Equipment" ? "day" : "lot", unitCost: "0", amount: "0", date: new Date().toISOString().slice(0, 10), supplierOrEmployee: "", referenceNo: "", notes: "" };
}

export default function CostLedger({ category, title, description }: { category: CostCategory; title: string; description: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(() => defaultForm(category));

  useEffect(() => {
    fetch("/api/projects")
      .then(async (r) => { if (!r.ok) throw new Error("Could not load projects."); return r.json(); })
      .then((data) => { setProjects(Array.isArray(data) ? data : []); if (data[0]) setProjectId(data[0]._id); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load projects."));
  }, []);

  useEffect(() => {
    if (!projectId) { setEntries([]); return; }
    setLoading(true);
    setError("");
    fetch(`/api/costs?projectId=${projectId}&category=${category}`)
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load cost records."); return data; })
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load cost records."))
      .finally(() => setLoading(false));
  }, [projectId, category]);

  const total = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), [entries]);
  const calculated = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);

  function openAdd() {
    setEditingId(null);
    setForm(defaultForm(category));
    setError("");
    setOpen(true);
  }

  function openEdit(entry: Entry) {
    setEditingId(entry._id);
    setForm({ description: entry.description, quantity: String(entry.quantity), unit: entry.unit, unitCost: String(entry.unitCost), amount: String(entry.amount), date: entry.date.slice(0, 10), supplierOrEmployee: entry.supplierOrEmployee || "", referenceNo: entry.referenceNo || "", notes: entry.notes || "" });
    setError("");
    setOpen(true);
  }

  async function saveEntry(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError("");
    const endpoint = editingId ? `/api/costs/${editingId}` : "/api/costs";
    const method = editingId ? "PATCH" : "POST";
    const payload = { ...form, projectId, category, amount: category === "Expense" ? Number(form.amount) : calculated };

    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this record.");
      if (editingId) setEntries((prev) => prev.map((entry) => entry._id === editingId ? data : entry));
      else setEntries((prev) => [data, ...prev]);
      setOpen(false);
      setEditingId(null);
      setForm(defaultForm(category));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    setError("");
    try {
      const response = await fetch(`/api/costs/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this record.");
      setEntries((prev) => prev.filter((entry) => entry._id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this record.");
    }
  }

  return (
    <main className="min-h-screen p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Cost Control / Register</div><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>
          <button disabled={!projectId} onClick={openAdd} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"><Plus size={16} /> Record {category === "Expense" ? "Expense" : category}</button>
        </div>

        {error && <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <div className="mb-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-[1fr_240px_240px]">
          <div className="bg-white p-4"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</label><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1.5 w-full border-0 bg-white p-0 text-sm font-bold outline-none"><option value="">Select a project</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}</select></div>
          <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recorded Entries</div><div className="mt-1 text-lg font-bold tabular-nums">{entries.length}</div></div>
          <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Actual Cost</div><div className="mt-1 text-lg font-bold tabular-nums">{money(total)}</div></div>
        </div>

        <div className="overflow-x-auto border border-slate-200 bg-white">
          {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading register...</div> : <table className="data-table min-w-[1100px] text-sm"><thead><tr><th>Date</th><th>Description</th><th>Supplier / Employee</th><th>Reference</th><th className="text-right">Qty</th><th>Unit</th><th className="text-right">Unit Cost</th><th className="text-right">Actual Amount</th><th className="text-right">Actions</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry._id}><td className="whitespace-nowrap">{new Date(entry.date).toLocaleDateString("en-PH")}</td><td className="font-semibold text-slate-900">{entry.description}</td><td>{entry.supplierOrEmployee || "—"}</td><td>{entry.referenceNo || "—"}</td><td className="text-right tabular-nums">{entry.quantity}</td><td>{entry.unit}</td><td className="text-right tabular-nums">{money(entry.unitCost)}</td><td className="text-right font-bold tabular-nums">{money(entry.amount)}</td><td><div className="flex justify-end gap-1"><button aria-label={`Edit ${entry.description}`} onClick={() => openEdit(entry)} className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={15} /></button><button aria-label={`Delete ${entry.description}`} onClick={() => removeEntry(entry._id)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody>{entries.length > 0 && <tfoot><tr><td colSpan={7} className="text-right font-bold">REGISTER TOTAL</td><td className="text-right text-base font-bold">{money(total)}</td><td /></tr></tfoot>}</table>}
          {!loading && entries.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No {title.toLowerCase()} records for this project.</div>}
        </div>

        {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={saveEntry} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-6 py-5"><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Cost Record</div><h2 className="mt-1 text-xl font-bold">{editingId ? `Edit ${category === "Expense" ? "Expense" : category}` : `Record ${category === "Expense" ? "Expense" : category}`}</h2></div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Description" required value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
            <Field label="Date" required type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
            <Field label={category === "Labor" ? "Employee" : category === "Material" ? "Supplier" : "Supplier / Provider"} value={form.supplierOrEmployee} onChange={(value) => setForm({ ...form, supplierOrEmployee: value })} />
            <Field label="Reference No." value={form.referenceNo} onChange={(value) => setForm({ ...form, referenceNo: value })} />
            {category !== "Expense" ? <><Field label="Quantity" required type="number" min="0" step="any" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} /><Field label="Unit" required value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} /><Field label="Unit Cost" required type="number" min="0" step="any" value={form.unitCost} onChange={(value) => setForm({ ...form, unitCost: value })} /></> : <Field label="Amount" required type="number" min="0" step="any" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />}
            <label className="sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          </div>
          {category !== "Expense" && <div className="mx-6 mb-2 border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm"><span className="text-slate-500">Calculated actual cost </span><b>{money(calculated)}</b></div>}
          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setOpen(false)} className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save Changes" : "Save Record"}</button></div>
        </form></div>}
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", required = false, min, step }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; min?: string; step?: string }) {
  return <label><span className="text-sm font-semibold text-slate-700">{label}{required && " *"}</span><input required={required} min={min} step={step} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>;
}

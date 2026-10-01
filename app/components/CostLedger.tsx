"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useProject } from "./ProjectContext";

export type CostCategory = "Material" | "Labor" | "Equipment" | "Expense";
type Project = { _id: string; name: string };
type BOQItem = { _id: string; itemNo: string; description: string; category: string; unit: string; quantity: number; unitCost: number; totalCost?: number };
type WorkSection = { _id: string; name: string; status: string; progress: number };
type Entry = { _id: string; description: string; quantity: number; unit: string; unitCost: number; amount: number; date: string; supplierOrEmployee: string; referenceNo: string; notes: string; category?: CostCategory; boqItemId?: string | null; workSectionId?: string | null };

type FormState = { description: string; quantity: string; unit: string; unitCost: string; amount: string; date: string; supplierOrEmployee: string; referenceNo: string; notes: string; boqItemId: string; workSectionId: string };
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);

function defaultForm(category: CostCategory): FormState {
  return { description: "", quantity: "1", unit: category === "Material" ? "pcs" : category === "Labor" ? "day" : category === "Equipment" ? "day" : "lot", unitCost: "0", amount: "0", date: new Date().toISOString().slice(0, 10), supplierOrEmployee: "", referenceNo: "", notes: "", boqItemId: "", workSectionId: "" };
}

export default function CostLedger({ category, title, description }: { category: CostCategory; title: string; description: string }) {
  const { projects, projectId, setProjectId } = useProject();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [workSections, setWorkSections] = useState<WorkSection[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(() => defaultForm(category));

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

  useEffect(() => {
    if (!projectId) { setBoqItems([]); return; }
    fetch(`/api/boq?projectId=${projectId}`, { cache: "no-store" })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load BOQ items."); return data; })
      .then((data) => setBoqItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load BOQ items."));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) { setWorkSections([]); return; }
    fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" })
      .then(async (r) => { const data = await r.json(); if (!r.ok) throw new Error(data.error || "Could not load work sections."); return data; })
      .then((data) => setWorkSections(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load work sections."));
  }, [projectId]);

  const total = useMemo(() => entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0), [entries]);
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => [entry.description, entry.supplierOrEmployee, entry.referenceNo, entry.unit, entry.notes || ""].some((value) => String(value).toLowerCase().includes(q)));
  }, [entries, search]);
  const boqCategory = category === "Material" ? "Materials" : category === "Expense" ? "Other" : category;
  const plannedItems = useMemo(() => boqItems.filter((item) => item.category === boqCategory), [boqItems, boqCategory]);
  const plannedTotal = useMemo(() => plannedItems.reduce((sum, item) => sum + Number(item.totalCost ?? Number(item.quantity || 0) * Number(item.unitCost || 0)), 0), [plannedItems]);
  const calculated = (Number(form.quantity) || 0) * (Number(form.unitCost) || 0);
  const selectedBOQ = useMemo(
    () => plannedItems.find((item) => item._id === form.boqItemId) || null,
    [plannedItems, form.boqItemId]
  );
  const selectedBOQActualQuantity = useMemo(
    () =>
      selectedBOQ
        ? entries
            .filter((entry) => entry.boqItemId === selectedBOQ._id && entry._id !== editingId)
            .reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)
        : 0,
    [entries, selectedBOQ, editingId]
  );
  const selectedBOQRemainingQuantity = selectedBOQ
    ? Number(selectedBOQ.quantity || 0) - selectedBOQActualQuantity
    : 0;
  const selectedBOQPlannedCost = selectedBOQ
    ? Number(selectedBOQ.totalCost ?? Number(selectedBOQ.quantity || 0) * Number(selectedBOQ.unitCost || 0))
    : 0;
  const selectedEntryCost = category === "Expense" ? Number(form.amount) || 0 : calculated;
  const selectedBOQActualCost = selectedBOQ
    ? entries
        .filter((entry) => entry.boqItemId === selectedBOQ._id && entry._id !== editingId)
        .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    : 0;
  const selectedBOQRemainingCost = selectedBOQ ? selectedBOQPlannedCost - selectedBOQActualCost : 0;
  const quantityOverrun =
    Boolean(selectedBOQ) &&
    category !== "Expense" &&
    Number(form.quantity || 0) > Math.max(0, selectedBOQRemainingQuantity);
  const costOverrun =
    Boolean(selectedBOQ) &&
    selectedEntryCost > Math.max(0, selectedBOQRemainingCost);

  function openAdd() {
    setEditingId(null);
    setForm(defaultForm(category));
    setError("");
    setOpen(true);
  }

  function openEdit(entry: Entry) {
    setEditingId(entry._id);
    setForm({ description: entry.description, quantity: String(entry.quantity), unit: entry.unit, unitCost: String(entry.unitCost), amount: String(entry.amount), date: entry.date.slice(0, 10), supplierOrEmployee: entry.supplierOrEmployee || "", referenceNo: entry.referenceNo || "", notes: entry.notes || "", boqItemId: entry.boqItemId || "", workSectionId: entry.workSectionId || "" });
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
    const payload = { ...form, projectId, category, boqItemId: form.boqItemId || undefined, workSectionId: form.workSectionId || undefined, amount: category === "Expense" ? Number(form.amount) : calculated };

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

        <div className="mb-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 md:grid-cols-[1fr_220px_220px_220px]">
          <div className="bg-white p-4"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Project</label><select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="mt-1.5 w-full border-0 bg-white p-0 text-sm font-bold outline-none"><option value="">Select a project</option>{projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}</select></div>
          <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recorded Entries</div><div className="mt-1 text-lg font-bold tabular-nums">{entries.length}</div></div>
          <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Planned BOQ Cost</div><div className="mt-1 text-lg font-bold tabular-nums">{money(plannedTotal)}</div></div><div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Actual / Planned</div><div className={`mt-1 text-lg font-bold tabular-nums ${plannedTotal && total > plannedTotal ? "text-red-600" : "text-slate-900"}`}>{plannedTotal ? `${(total / plannedTotal * 100).toFixed(1)}%` : "—"}</div></div>
        </div>

        <div className="mb-4 flex items-center gap-3 border border-slate-200 bg-white p-4">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, supplier, reference..." className="min-w-0 flex-1 border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
          <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{filteredEntries.length} of {entries.length} records</span>
        </div>
        <div className="overflow-x-auto border border-slate-200 bg-white">
          {loading ? <div className="p-12 text-center text-sm text-slate-500">Loading register...</div> : <table className="data-table min-w-[1100px] text-sm"><thead><tr><th>Date</th><th>Description</th><th>BOQ Baseline</th><th>Work Section</th><th>Supplier / Employee</th><th>Reference</th><th className="text-right">Qty</th><th>Unit</th><th className="text-right">Unit Cost</th><th className="text-right">Actual Amount</th><th className="text-right">Actions</th></tr></thead><tbody>{filteredEntries.map((entry) => <tr key={entry._id}><td className="whitespace-nowrap">{new Date(entry.date).toLocaleDateString("en-PH")}</td><td className="font-semibold text-slate-900">{entry.description}</td><td>{entry.boqItemId ? (boqItems.find((item) => item._id === entry.boqItemId)?.itemNo || "Linked") : "—"}</td><td>{entry.workSectionId ? (workSections.find((section) => section._id === entry.workSectionId)?.name || "Linked") : "—"}</td><td>{entry.supplierOrEmployee || "—"}</td><td>{entry.referenceNo || "—"}</td><td className="text-right tabular-nums">{entry.quantity}</td><td>{entry.unit}</td><td className="text-right tabular-nums">{money(entry.unitCost)}</td><td className="text-right font-bold tabular-nums">{money(entry.amount)}</td><td><div className="flex justify-end gap-1"><button aria-label={`Edit ${entry.description}`} onClick={() => openEdit(entry)} className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={15} /></button><button aria-label={`Delete ${entry.description}`} onClick={() => removeEntry(entry._id)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button></div></td></tr>)}</tbody>{filteredEntries.length > 0 && <tfoot><tr><td colSpan={9} className="text-right font-bold">REGISTER TOTAL</td><td className="text-right text-base font-bold">{money(total)}</td><td /></tr></tfoot>}</table>}
          {!loading && entries.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No {title.toLowerCase()} records for this project.</div>}{!loading && entries.length > 0 && filteredEntries.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No records match the current search.</div>}
        </div>

        {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={saveEntry} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-6 py-5"><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Cost Record</div><h2 className="mt-1 text-xl font-bold">{editingId ? `Edit ${category === "Expense" ? "Expense" : category}` : `Record ${category === "Expense" ? "Expense" : category}`}</h2></div>
          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Description" required value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
            <Field label="Date" required type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
            <Field label={category === "Labor" ? "Employee" : category === "Material" ? "Supplier" : "Supplier / Provider"} value={form.supplierOrEmployee} onChange={(value) => setForm({ ...form, supplierOrEmployee: value })} />
            <Field label="Reference No." value={form.referenceNo} onChange={(value) => setForm({ ...form, referenceNo: value })} />
            <label className="sm:col-span-2"><span className="text-sm font-semibold text-slate-700">BOQ Baseline</span><select value={form.boqItemId} onChange={(e) => setForm({ ...form, boqItemId: e.target.value })} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">No BOQ link</option>{plannedItems.map((item) => <option key={item._id} value={item._id}>{item.itemNo} · {item.description} · {money(Number(item.totalCost ?? Number(item.quantity || 0) * Number(item.unitCost || 0)))}</option>)}</select></label>
            <label className="sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Work Section</span><select value={form.workSectionId} onChange={(e) => setForm({ ...form, workSectionId: e.target.value })} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="">No work section link</option>{workSections.map((section) => <option key={section._id} value={section._id}>{section.name} · {section.progress}% · {section.status}</option>)}</select></label>
            {selectedBOQ && <div className="sm:col-span-2 grid gap-2 border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-4"><div><div className="font-bold uppercase tracking-wider text-slate-500">Planned Qty</div><div className="mt-1 text-sm font-bold">{selectedBOQ.quantity} {selectedBOQ.unit}</div></div><div><div className="font-bold uppercase tracking-wider text-slate-500">Recorded Qty</div><div className="mt-1 text-sm font-bold">{selectedBOQActualQuantity} {selectedBOQ.unit}</div></div><div><div className="font-bold uppercase tracking-wider text-slate-500">Remaining Qty</div><div className={`mt-1 text-sm font-bold ${selectedBOQRemainingQuantity < 0 ? "text-red-600" : "text-slate-900"}`}>{Math.max(0, selectedBOQRemainingQuantity)} {selectedBOQ.unit}</div></div><div><div className="font-bold uppercase tracking-wider text-slate-500">Remaining Cost</div><div className={`mt-1 text-sm font-bold ${selectedBOQRemainingCost < 0 ? "text-red-600" : "text-slate-900"}`}>{money(Math.max(0, selectedBOQRemainingCost))}</div></div></div>}
            {category !== "Expense" ? <><Field label="Quantity" required type="number" min="0" step="any" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} /><Field label="Unit" required value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} /><Field label="Unit Cost" required type="number" min="0" step="any" value={form.unitCost} onChange={(value) => setForm({ ...form, unitCost: value })} /></> : <Field label="Amount" required type="number" min="0" step="any" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />}
            <label className="sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
          </div>
          {selectedBOQ && (quantityOverrun || costOverrun) && <div className="mx-6 mb-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><div className="font-bold">BOQ control warning</div><div className="mt-1">{quantityOverrun && `This entry exceeds the remaining BOQ quantity by ${(Number(form.quantity || 0) - Math.max(0, selectedBOQRemainingQuantity)).toFixed(2)} ${selectedBOQ.unit}. `}{costOverrun && `This entry exceeds the remaining BOQ cost by ${money(selectedEntryCost - Math.max(0, selectedBOQRemainingCost))}.`}</div><div className="mt-1 text-xs text-amber-800">You can still record the actual if the overrun is intentional; this warning does not block saving.</div></div>}
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

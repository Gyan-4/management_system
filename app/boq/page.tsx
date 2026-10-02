"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useProject } from "@/app/components/ProjectContext";

type Section = { _id: string; name: string };
type Item = {
  _id: string;
  itemNo: string;
  workSectionId?: string | null;
  workSectionName?: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  actualQuantity?: number;
  actualCost?: number;
  quantityVariance?: number;
  costVariance?: number;
  notes?: string;
};

const categories = ["Materials", "Labor", "Equipment", "Other"];
const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0);
const emptyForm = { itemNo: "", workSectionId: "", description: "", category: "Materials", unit: "pcs", quantity: "1", unitCost: "0", notes: "" };

async function readError(r: Response, fallback: string) {
  try { const d = await r.json(); return d?.error || fallback; } catch { return fallback; }
}

export default function BOQPage() {
  const { projectId, project } = useProject();
  const [items, setItems] = useState<Item[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  async function load() {
    if (!projectId) { setItems([]); setSections([]); return; }
    setLoading(true);
    setError("");
    try {
      let sectionResponse = await fetch(`/api/projects/${projectId}/sections`, { cache: "no-store" });
      let loadedSections: Section[] = sectionResponse.ok ? await sectionResponse.json() : [];
      if (!Array.isArray(loadedSections) || loadedSections.length === 0) {
        const created = await fetch(`/api/projects/${projectId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useDefaultTemplate: true }),
        });
        if (!created.ok) throw new Error(await readError(created, "Could not prepare work sections."));
        loadedSections = await created.json();
      }

      const boqResponse = await fetch(`/api/boq?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!boqResponse.ok) throw new Error(await readError(boqResponse, "Could not load BOQ items."));
      const boqItems = await boqResponse.json();

      setSections(Array.isArray(loadedSections) ? loadedSections : []);
      setItems(Array.isArray(boqItems) ? boqItems : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load BOQ.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  const amount = (i: Item) => Number(i.totalCost ?? Number(i.quantity || 0) * Number(i.unitCost || 0));
  const total = useMemo(() => items.reduce((s, i) => s + amount(i), 0), [items]);
  const actualTotal = useMemo(() => items.reduce((s, i) => s + Number(i.actualCost || 0), 0), [items]);
  const costVariance = total - actualTotal;
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(i => {
      const categoryMatch = categoryFilter === "All" || i.category === categoryFilter;
      const textMatch = !q || [i.itemNo, i.description, i.unit, i.category, i.workSectionName || ""].some(v => String(v).toLowerCase().includes(q));
      return categoryMatch && textMatch;
    });
  }, [items, search, categoryFilter]);
  const nextItemNo = useMemo(() => {
    const numeric = items.map(i => Number(i.itemNo)).filter(n => Number.isFinite(n) && n > 0);
    return String((numeric.length ? Math.max(...numeric) : 0) + 1);
  }, [items]);

  function add() {
    setEditingId(null);
    setForm({ ...emptyForm, itemNo: nextItemNo, workSectionId: sections[0]?._id || "" });
    setOpen(true);
    setError("");
  }

  function edit(i: Item) {
    setEditingId(i._id);
    setForm({
      itemNo: i.itemNo,
      workSectionId: i.workSectionId || "",
      description: i.description,
      category: i.category,
      unit: i.unit,
      quantity: String(i.quantity),
      unitCost: String(i.unitCost),
      notes: i.notes || "",
    });
    setOpen(true);
    setError("");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setSaving(true);
    setError("");
    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);
    if (!form.description.trim() || !form.workSectionId) {
      setError("Description and work section are required.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isFinite(unitCost) || unitCost < 0) {
      setError("Quantity and unit rate must be valid non-negative numbers.");
      setSaving(false);
      return;
    }

    try {
      const r = await fetch(editingId ? `/api/boq/${editingId}` : "/api/boq", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId, quantity, unitCost }),
      });
      if (!r.ok) throw new Error(await readError(r, "Could not save BOQ item."));
      await load();
      setOpen(false);
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save BOQ item.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this BOQ item?")) return;
    const r = await fetch("/api/boq/" + id, { method: "DELETE" });
    if (!r.ok) { setError(await readError(r, "Could not delete BOQ item.")); return; }
    await load();
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Project Estimate</div>
            <h1 className="mt-1 text-2xl font-bold">Bill of Quantities</h1>
            <p className="mt-1 text-sm text-slate-500">{project ? `Enter the estimate once. It will automatically appear in Project Breakdown.` : "Select a project from the top bar to begin."}</p>
          </div>
          <button disabled={!projectId} onClick={add} className="flex items-center justify-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Plus size={16}/> Add Estimate Line</button>
        </header>

        {error && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-5 grid grid-cols-2 border border-slate-200 bg-slate-200 md:grid-cols-5">
          <Stat label="BOQ Estimate" value={money(total)} />
          <Stat label="Actual Cost" value={money(actualTotal)} />
          <Stat label="Remaining" value={money(total - actualTotal)} />
          <Stat label="Budget" value={money(project?.budget || 0)} />
          <Stat label="Unspent Budget" value={money((project?.budget || 0) - actualTotal)} />
        </div>

        <div className="mt-5 border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900">
          <b>One entry only:</b> choose the work section here, then enter the planned quantity and unit rate. You do not need to enter the same estimate again in Breakdown.
        </div>

        <div className="mt-5 flex flex-col gap-3 border border-slate-200 bg-white p-4 md:flex-row">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, description, or section..." className="min-w-0 flex-1 border border-slate-300 px-3 py-2.5 text-sm" />
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-slate-300 px-3 py-2.5 text-sm"><option>All</option>{categories.map(c => <option key={c}>{c}</option>)}</select>
          <div className="flex items-center text-xs font-semibold text-slate-500">{filteredItems.length} lines</div>
        </div>

        <section className="mt-5 overflow-x-auto border border-slate-200 bg-white">
          {loading ? <div className="p-12 text-center text-sm text-slate-500">Preparing estimate...</div> : (
            <table className="data-table min-w-[1350px]">
              <thead><tr><th>Item</th><th>Work Section</th><th>Description</th><th>Category</th><th>Unit</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Estimate</th><th className="text-right">Actual Qty</th><th className="text-right">Actual Cost</th><th className="text-right">Variance</th><th></th></tr></thead>
              <tbody>
                {filteredItems.map(i => {
                  const planned = Number(i.quantity || 0);
                  const actual = Number(i.actualQuantity || 0);
                  const variance = amount(i) - Number(i.actualCost || 0);
                  return <tr key={i._id}>
                    <td className="font-mono text-xs">{i.itemNo}</td>
                    <td className="font-semibold">{i.workSectionName || "Unassigned"}</td>
                    <td className="font-semibold">{i.description}</td>
                    <td>{i.category}</td>
                    <td>{i.unit}</td>
                    <td className="text-right tabular-nums">{planned}</td>
                    <td className="text-right tabular-nums">{money(i.unitCost)}</td>
                    <td className="text-right font-bold tabular-nums">{money(amount(i))}</td>
                    <td className="text-right tabular-nums">{actual}</td>
                    <td className="text-right font-semibold tabular-nums">{money(i.actualCost || 0)}</td>
                    <td className={`text-right font-semibold tabular-nums ${variance < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(variance)}</td>
                    <td><div className="flex justify-end"><button onClick={() => edit(i)} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={15}/></button><button onClick={() => remove(i._id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={15}/></button></div></td>
                  </tr>;
                })}
              </tbody>
              {items.length > 0 && <tfoot><tr><td colSpan={7} className="text-right font-bold">TOTAL</td><td className="text-right font-bold">{money(total)}</td><td></td><td className="text-right font-bold">{money(actualTotal)}</td><td className={`text-right font-bold ${costVariance < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(costVariance)}</td><td></td></tr></tfoot>}
            </table>
          )}
          {!loading && items.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No estimate lines yet. Add the first one above.</div>}
          {!loading && items.length > 0 && filteredItems.length === 0 && <div className="p-12 text-center text-sm text-slate-500">No estimate lines match the current filter.</div>}
        </section>

        {open && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <form onSubmit={save} className="w-full max-w-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Estimate Line</div>
              <h2 className="mt-1 text-xl font-bold">{editingId ? "Edit Estimate" : "Add Estimate Line"}</h2>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Item No." value={form.itemNo} onChange={v => setForm({ ...form, itemNo: v })} />
              <label><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Work Section *</span><select required value={form.workSectionId} onChange={e => setForm({ ...form, workSectionId: e.target.value })} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm"><option value="">Select section</option>{sections.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
              <Field label="Description" required value={form.description} onChange={v => setForm({ ...form, description: v })} />
              <label><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Category *</span><select required value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm">{categories.map(c => <option key={c}>{c}</option>)}</select></label>
              <Field label="Unit" required value={form.unit} onChange={v => setForm({ ...form, unit: v })} />
              <Field label="Quantity" required type="number" min="0" step="any" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} />
              <Field label="Unit Rate" required type="number" min="0" step="any" value={form.unitCost} onChange={v => setForm({ ...form, unitCost: v })} />
              <label className="sm:col-span-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Notes (optional)</span><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm"/></label>
            </div>
            <div className="mx-6 mb-2 border border-slate-200 bg-slate-50 px-4 py-3 text-right text-sm">Planned Amount <b className="ml-2">{money((Number(form.quantity) || 0) * (Number(form.unitCost) || 0))}</b></div>
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={() => setOpen(false)} className="border border-slate-300 bg-white px-4 py-2.5 text-sm">Cancel</button><button disabled={saving} className="bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : editingId ? "Save Changes" : "Add Estimate"}</button></div>
          </form>
        </div>}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-4"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1.5 text-lg font-bold tabular-nums">{value}</div></div>;
}

function Field({ label, value, onChange, type = "text", required = false, min, step }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; min?: string; step?: string }) {
  return <label><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}{required && " *"}</span><input required={required} min={min} step={step} type={type} value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm"/></label>;
}

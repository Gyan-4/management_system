"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type BOQItem = {
  _id: string;
  itemNo: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost?: number;
  actualQuantity?: number;
  actualCost?: number;
};

type Item = {
  _id: string;
  boqItemId?: string | null;
  itemNo?: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  actualCost?: number;
  ledgerActualQuantity?: number;
  ledgerActualCost?: number;
  ledgerQuantityVariance?: number;
  ledgerCostVariance?: number;
  source?: string;
};

type Section = {
  _id: string;
  name: string;
  description?: string;
  order: number;
  status: string;
  progress: number;
  calculatedProgress?: number;
  estimated?: number;
  actual?: number;
  remaining?: number;
  boqLineCount?: number;
  items: Item[];
};

type Project = {
  _id: string;
  name: string;
  client: string;
  location?: string;
  contractAmount: number;
  budget: number;
  projectCompletion?: number;
};

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

async function errorText(r: Response, fallback: string) {
  try { const d = await r.json(); return d?.error || fallback; } catch { return fallback; }
}

export default function ProjectBreakdownPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Section | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    params.then(({ projectId: id }) => { if (active) setProjectId(id); });
    return () => { active = false; };
  }, [params]);

  async function load(id = projectId) {
    if (!id) return;
    setLoading(true);
    try {
      const [projectResponse, sectionsResponse, boqResponse] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch(`/api/projects/${id}/sections`, { cache: "no-store" }),
        fetch(`/api/boq?projectId=${id}`, { cache: "no-store" }),
      ]);
      if (!projectResponse.ok) throw new Error(await errorText(projectResponse, "Could not load projects."));
      if (!sectionsResponse.ok) throw new Error(await errorText(sectionsResponse, "Could not load breakdown."));
      if (!boqResponse.ok) throw new Error(await errorText(boqResponse, "Could not load BOQ."));

      const projects: Project[] = await projectResponse.json();
      const found = projects.find(p => p._id === id);
      if (!found) throw new Error("Project not found.");

      const sectionResult = await sectionsResponse.json();
      const boqResult = await boqResponse.json();
      setProject(found);
      setSections(Array.isArray(sectionResult) ? sectionResult : []);
      setBoqItems(Array.isArray(boqResult) ? boqResult : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load breakdown.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const totals = useMemo(() => {
    const estimated = sections.reduce((sum, s) => sum + Number(s.estimated || 0), 0);
    const actual = sections.reduce((sum, s) => sum + Number(s.actual || 0), 0);
    const progress = estimated
      ? sections.reduce((sum, s) => sum + Number(s.estimated || 0) * Number(s.progress || 0), 0) / estimated
      : 0;
    const boqBaseline = boqItems.reduce((sum, item) => sum + Number(item.totalCost ?? Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);
    const assigned = sections.reduce((sum, s) => sum + Number(s.estimated || 0), 0);
    return { estimated, actual, progress, boqBaseline, assigned, unassigned: boqBaseline - assigned };
  }, [sections, boqItems]);

  async function createSection() {
    const name = window.prompt("New work section name");
    if (!name?.trim()) return;
    const r = await fetch(`/api/projects/${projectId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), useDefaultTemplate: false }),
    });
    if (!r.ok) { setError(await errorText(r, "Could not add section.")); return; }
    await load();
  }

  async function saveSection(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/sections/${editing._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editing.name, description: editing.description, status: editing.status }),
    });
    if (!r.ok) setError(await errorText(r, "Could not save section."));
    else { setEditing(null); await load(); }
    setSaving(false);
  }

  async function deleteSection(section: Section) {
    if (section.items.length) {
      setError("This section contains BOQ lines. Reassign or remove those BOQ lines before deleting the section.");
      return;
    }
    if (!window.confirm(`Delete “${section.name}”?`)) return;
    const r = await fetch(`/api/projects/${projectId}/sections/${section._id}`, { method: "DELETE" });
    if (!r.ok) { setError(await errorText(r, "Could not delete section.")); return; }
    await load();
  }

  if (loading) return <main className="p-8"><div className="mx-auto max-w-[1500px] text-sm text-slate-500">Loading project breakdown...</div></main>;
  if (error && !project) return <main className="p-8"><div className="mx-auto max-w-[1500px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div></main>;

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <Link href="/projects" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-blue-600"><ArrowLeft size={14}/> Projects</Link>

        <header className="mt-4 border-b border-slate-200 pb-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-blue-600">Project Breakdown</div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{project?.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{project?.client}{project?.location ? ` · ${project.location}` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5">Contract: {money(project?.contractAmount || 0)}</span>
                <span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5">Budget: {money(project?.budget || 0)}</span>
                <span className="border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-blue-700">Completion: {totals.progress.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/boq?projectId=${projectId}`} className="border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">Edit Estimate / BOQ</Link>
              <button onClick={createSection} className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={16}/> Add Section</button>
              <Link href={`/cost-analysis?projectId=${projectId}`} className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Cost Analysis</Link>
            </div>
          </div>
        </header>

        {error && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="mt-6 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5">
          <Summary label="BOQ Estimate" value={money(totals.boqBaseline)} />
          <Summary label="Assigned to Sections" value={money(totals.assigned)} />
          <Summary label="Actual Cost" value={money(totals.actual)} />
          <Summary label="Remaining Estimate" value={money(totals.estimated - totals.actual)} />
          <Summary label="Overall Progress" value={`${totals.progress.toFixed(1)}%`} />
        </div>

        <div className={`mt-3 border px-4 py-3 text-xs ${totals.unassigned > 0 ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          <span className="font-bold">Estimate control:</span>{" "}
          {totals.unassigned > 0
            ? `${money(totals.unassigned)} of the BOQ is not assigned to a work section yet. Assign it from the BOQ page.`
            : "All BOQ estimate lines are assigned to work sections. No duplicate section estimate is required."}
        </div>

        <section className="mt-6 border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">Work Breakdown</h2>
            <p className="mt-1 text-xs text-slate-500">Planned quantities and rates come directly from the BOQ. Actual quantities come from recorded cost entries. Progress is calculated automatically.</p>
          </div>

          {sections.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">No work sections yet. Open the BOQ to initialize the standard sections.</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sections.map(section => {
                const isOpen = !!open[section._id];
                const estimated = Number(section.estimated || 0);
                const actual = Number(section.actual || 0);
                const variance = estimated - actual;
                return (
                  <article key={section._id}>
                    <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_150px_150px_150px_130px_auto] lg:items-center">
                      <button onClick={() => setOpen(v => ({ ...v, [section._id]: !isOpen }))} className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">{String(section.order + 1).padStart(2, "0")}</span>
                          <span className="font-bold text-slate-900">{section.name}</span>
                          {isOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                        </div>
                        <div className="mt-2 h-2 w-full max-w-md bg-slate-100">
                          <div className="h-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, Number(section.progress || 0)))}%` }}/>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">{section.boqLineCount || 0} BOQ lines · Progress calculated from actual quantities</div>
                      </button>
                      <Metric label="BOQ Estimate" value={money(estimated)} />
                      <Metric label="Actual Cost" value={money(actual)} />
                      <Metric label="Remaining" value={money(variance)} danger={variance < 0} />
                      <Metric label="Progress" value={`${Number(section.progress || 0).toFixed(1)}%`} />
                      <div className="flex justify-end gap-1">
                        <button title="Edit section" onClick={() => setEditing({ ...section })} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button>
                        <button title="Delete empty section" onClick={() => deleteSection(section)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.status}</div>
                            <p className="mt-1 text-sm text-slate-600">{section.description || "No section description."}</p>
                          </div>
                          <Link href={`/boq?projectId=${projectId}`} className="text-xs font-bold text-blue-700 hover:underline">Edit BOQ lines →</Link>
                        </div>

                        {section.items.length === 0 ? (
                          <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No BOQ lines assigned to this section.</div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 bg-white">
                            <table className="data-table min-w-[1000px]">
                              <thead><tr><th>BOQ</th><th>Description</th><th>Category</th><th>Planned Qty</th><th>Actual Qty</th><th>Qty Remaining</th><th className="text-right">Unit Rate</th><th className="text-right">Estimate</th><th className="text-right">Actual Cost</th><th className="text-right">Cost Variance</th></tr></thead>
                              <tbody>
                                {section.items.map(item => {
                                  const planned = Number(item.quantity || 0);
                                  const actualQty = Number(item.ledgerActualQuantity || 0);
                                  const plannedCost = planned * Number(item.unitCost || 0);
                                  const actualCost = Number(item.ledgerActualCost || 0);
                                  const costVariance = plannedCost - actualCost;
                                  return <tr key={item._id}>
                                    <td className="font-mono text-xs">{item.itemNo || item.boqItemId}</td>
                                    <td className="font-semibold">{item.description}</td>
                                    <td>{item.category}</td>
                                    <td className="tabular-nums">{planned.toLocaleString()} {item.unit}</td>
                                    <td className="font-semibold tabular-nums">{actualQty.toLocaleString()} {item.unit}</td>
                                    <td className={`font-semibold tabular-nums ${planned - actualQty < 0 ? "text-red-600" : "text-slate-700"}`}>{(planned - actualQty).toLocaleString()} {item.unit}</td>
                                    <td className="text-right tabular-nums">{money(item.unitCost)}</td>
                                    <td className="text-right font-semibold tabular-nums">{money(plannedCost)}</td>
                                    <td className="text-right font-semibold tabular-nums">{money(actualCost)}</td>
                                    <td className={`text-right font-semibold tabular-nums ${costVariance < 0 ? "text-red-600" : "text-emerald-700"}`}>{money(costVariance)}</td>
                                  </tr>;
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4">
        <form onSubmit={saveSection} className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4"><div><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Work Section</div><h2 className="mt-1 text-lg font-bold">Edit Section</h2></div><button type="button" onClick={() => setEditing(null)}><X size={18}/></button></div>
          <div className="space-y-4">
            <Field label="Section Name" value={editing.name} onChange={v => setEditing({ ...editing, name: v })}/>
            <Field label="Description" value={editing.description || ""} onChange={v => setEditing({ ...editing, description: v })}/>
            <SelectField label="Status" value={editing.status} options={["Existing","Not Started","In Progress","Completed","On Hold","For Repair","Skipped"]} onChange={v => setEditing({ ...editing, status: v })}/>
          </div>
          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={() => setEditing(null)} className="border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Save size={15}/>{saving ? "Saving..." : "Save Changes"}</button></div>
        </form>
      </div>}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</div></div>;
}

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className={`mt-1 font-bold tabular-nums ${danger ? "text-red-600" : "text-slate-900"}`}>{value}</div></div>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><input value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"/></label>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={e => onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">{options.map(o => <option key={o}>{o}</option>)}</select></label>;
}

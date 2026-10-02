"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Pencil, Plus, Save, Trash2, X } from "lucide-react";

type BOQItem = { _id: string; itemNo: string; description: string; category: "Materials" | "Labor" | "Equipment" | "Other"; unit: string; quantity: number; unitCost: number; totalCost?: number };
type Item = { _id?: string; boqItemId?: string | null; description: string; category: "Material" | "Labor" | "Equipment" | "Other"; calculation: string; quantity: number; unit: string; unitCost: number; actualCost: number; ledgerActualQuantity?: number; ledgerActualCost?: number; ledgerQuantityVariance?: number; ledgerCostVariance?: number };
type Section = { _id: string; name: string; description?: string; order: number; status: string; progress: number; ledgerActualCost?: number; items: Item[] };
type Project = { _id: string; name: string; client: string; location?: string; contractAmount: number; budget: number; projectCompletion?: number };

const money = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

const emptyItem: Item = { description: "", category: "Material", calculation: "", quantity: 0, unit: "", unitCost: 0, actualCost: 0, boqItemId: null };

async function errorText(r: Response, fallback: string) {
  try { const data = await r.json(); return data?.error || fallback; } catch { return fallback; }
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
  const [itemSection, setItemSection] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<Item>(emptyItem);

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
      if (!sectionsResponse.ok) throw new Error(await errorText(sectionsResponse, "Could not load project breakdown."));
      if (!boqResponse.ok) throw new Error(await errorText(boqResponse, "Could not load BOQ items."));
      const projects: Project[] = await projectResponse.json();
      const found = projects.find((p) => p._id === id);
      if (!found) throw new Error("Project not found.");
      const result = await sectionsResponse.json();
      const boqResult = await boqResponse.json();
      setProject(found);
      setSections(Array.isArray(result) ? result : []);
      setBoqItems(Array.isArray(boqResult) ? boqResult : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load project breakdown.");
    } finally { setLoading(false); }
  }

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const totals = useMemo(() => {
    const estimated = sections.reduce((sum, s) => sum + s.items.reduce((a, i) => a + Number(i.quantity || 0) * Number(i.unitCost || 0), 0), 0);
    const actual = sections.reduce((sum, s) => sum + (Number(s.ledgerActualCost || 0) > 0 ? Number(s.ledgerActualCost) : s.items.reduce((a, i) => a + Number(i.actualCost || 0), 0)), 0);
    const weightedProgress = estimated ? sections.reduce((sum, s) => sum + (s.items.reduce((a, i) => a + Number(i.quantity || 0) * Number(i.unitCost || 0), 0) * Number(s.progress || 0)), 0) / estimated : sections.length ? sections.reduce((sum, s) => sum + Number(s.progress || 0), 0) / sections.length : 0;
    const boqBaseline = boqItems.reduce((sum, item) => sum + Number(item.totalCost ?? Number(item.quantity || 0) * Number(item.unitCost || 0)), 0);
    return { estimated, actual, remaining: estimated - actual, progress: weightedProgress, boqBaseline, estimateVariance: boqBaseline - estimated };
  }, [sections, boqItems]);

  async function createSection() {
    const name = window.prompt("Work section name", "New Work Section");
    if (!name?.trim()) return;
    setError("");
    const r = await fetch(`/api/projects/${projectId}/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), useDefaultTemplate: false }) });
    if (!r.ok) { setError(await errorText(r, "Could not add section.")); return; }
    await load();
  }

  async function saveSection(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/sections/${editing._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    if (!r.ok) setError(await errorText(r, "Could not save section."));
    else { setEditing(null); await load(); }
    setSaving(false);
  }

  async function deleteSection(section: Section) {
    if (!window.confirm(`Delete “${section.name}” and its calculations?`)) return;
    const r = await fetch(`/api/projects/${projectId}/sections/${section._id}`, { method: "DELETE" });
    if (!r.ok) { setError(await errorText(r, "Could not delete section.")); return; }
    await load();
  }

  function addItem(section: Section) { setItemSection(section._id); setItemForm({ ...emptyItem }); setOpen((v) => ({ ...v, [section._id]: true })); }
  function editItem(section: Section, item: Item) { setItemSection(section._id); setItemForm({ ...item }); setOpen((v) => ({ ...v, [section._id]: true })); }

  async function saveItem(section: Section) {
    if (!itemForm.description.trim()) { setError("Item description is required."); return; }
    const items = itemForm._id ? section.items.map((item) => item._id === itemForm._id ? itemForm : item) : [...section.items, { ...itemForm }];
    const r = await fetch(`/api/projects/${projectId}/sections/${section._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    if (!r.ok) { setError(await errorText(r, "Could not save calculation item.")); return; }
    setItemSection(null); setItemForm(emptyItem); await load();
  }

  async function removeItem(section: Section, itemId?: string) {
    if (!itemId) return;
    const items = section.items.filter((item) => item._id !== itemId);
    const r = await fetch(`/api/projects/${projectId}/sections/${section._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    if (!r.ok) { setError(await errorText(r, "Could not remove item.")); return; }
    await load();
  }

  async function duplicateSection(section: Section) {
    const r = await fetch(`/api/projects/${projectId}/sections`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `${section.name} Copy`, useDefaultTemplate: false }) });
    if (!r.ok) { setError(await errorText(r, "Could not duplicate section.")); return; }
    const created = await r.json();
    const copy = Array.isArray(created) ? created[0] : created;
    const update = await fetch(`/api/projects/${projectId}/sections/${copy._id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: section.description || "", status: section.status, progress: section.progress, items: section.items }) });
    if (!update.ok) setError(await errorText(update, "Section created but items could not be copied."));
    await load();
  }

  if (loading) return <main className="p-8"><div className="mx-auto max-w-[1500px] text-sm text-slate-500">Loading project breakdown...</div></main>;
  if (error && !project) return <main className="p-8"><div className="mx-auto max-w-[1500px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div></main>;

  const noBoqBaseline = totals.boqBaseline === 0 && totals.estimated > 0;

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
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5">Contract: {money(project?.contractAmount || 0)}</span><span className="border border-slate-200 bg-slate-50 px-2.5 py-1.5">Budget: {money(project?.budget || 0)}</span><span className="border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-blue-700">Project Completion: {Math.min(100, Math.max(0, Number(project?.projectCompletion || 0))).toFixed(1)}%</span></div>
            </div>
            <div className="flex flex-wrap gap-2"><button onClick={createSection} className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus size={16}/> Add Work Section</button><Link href={`/cost-analysis?projectId=${projectId}`} className="border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cost Analysis</Link></div>
          </div>
        </header>
        {error && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <section className="mt-6 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-6"><Summary label="BOQ Baseline" value={money(totals.boqBaseline)} /><Summary label="Section Estimate" value={money(totals.estimated)} /><Summary label="Actual Cost" value={money(totals.actual)} /><Summary label="Remaining Cost" value={money(totals.remaining)} /><Summary label="Overall Progress" value={`${totals.progress.toFixed(0)}%`} /><Summary label="Budget Headroom" value={money((project?.budget || 0) - totals.actual)} /></section>
        <div className={`mt-3 border px-4 py-3 text-xs ${totals.estimateVariance < 0 && !noBoqBaseline ? "border-red-200 bg-red-50 text-red-800" : noBoqBaseline ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600"}`}>
          <span className="font-bold">BOQ to section control:</span>{" "}
          {noBoqBaseline ? `${money(totals.estimated)} of section estimates currently have no BOQ baseline. Add the project's BOQ lines, then link relevant Breakdown items to those BOQ lines for planned-vs-actual control.` : totals.estimateVariance >= 0 ? `${money(totals.estimateVariance)} of BOQ baseline is not yet represented in work-section estimates.` : `${money(Math.abs(totals.estimateVariance))} of section estimates exceed the BOQ baseline.`}
        </div>

        <section className="mt-6 border border-slate-200 bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center"><div><h2 className="font-bold text-slate-900">Construction / Work Sections</h2><p className="mt-1 text-xs text-slate-500">Every section contains its calculations, resources and costs. Changes roll into this project overview.</p></div><div className="text-right text-xs text-slate-500">Budget: <span className="font-bold text-slate-800">{money(project?.budget || 0)}</span></div></div>
          {sections.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No work sections yet. Add one, or the first section can initialize the standard construction template.<div className="mt-4"><button onClick={async()=>{const r=await fetch(`/api/projects/${projectId}/sections`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({useDefaultTemplate:true})});if(!r.ok){setError(await errorText(r,"Could not initialize template."));return;}await load();}} className="border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700 hover:bg-slate-50">Use Standard Template</button></div></div> : <div className="divide-y divide-slate-200">
            {sections.map((section) => {
              const estimated = section.items.reduce((a, i) => a + Number(i.quantity || 0) * Number(i.unitCost || 0), 0);
              const manualActual = section.items.reduce((a, i) => a + Number(i.actualCost || 0), 0);
              const actual = Number(section.ledgerActualCost || 0) > 0 ? Number(section.ledgerActualCost) : manualActual;
              const variance = estimated - actual;
              const boqLinkedEstimate = section.items.reduce((a, i) => a + (i.boqItemId ? Number(i.quantity || 0) * Number(i.unitCost || 0) : 0), 0);
              const isOpen = !!open[section._id];
              return <article key={section._id}>
                <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_170px_180px_170px_auto] lg:items-center">
                  <button onClick={()=>setOpen(v=>({...v,[section._id]:!isOpen}))} className="text-left"><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">{String(section.order + 1).padStart(2,"0")}</span><span className="font-bold text-slate-900">{section.name}</span>{isOpen?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</div><div className="mt-2 h-1.5 w-full max-w-md bg-slate-100"><div className="h-full bg-blue-600" style={{width:`${Math.max(0,Math.min(100,section.progress))}%`}}/></div><div className="mt-1 text-[10px] text-slate-400">{section.ledgerActualCost ? "Actual from cost ledger" : "Manual section actual"} · {money(boqLinkedEstimate)} BOQ-linked estimate</div></button>
                  <Metric label="Estimated" value={money(estimated)} /><Metric label="Actual" value={money(actual)} /><Metric label="Variance" value={money(variance)} danger={variance<0}/><Metric label="Progress" value={`${section.progress}%`}/>
                  <div className="flex justify-end gap-1"><button title="Edit section" onClick={()=>setEditing({...section,items:section.items.map(i=>({...i}))})} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Pencil size={15}/></button><button title="Duplicate section" onClick={()=>duplicateSection(section)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Copy size={15}/></button><button title="Delete section" onClick={()=>deleteSection(section)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button></div>
                </div>
                {isOpen && <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{section.status}</div><p className="mt-1 text-sm text-slate-600">{section.description || "No section description."}</p></div><button onClick={()=>addItem(section)} className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Plus size={14}/> Add Calculation / Cost Item</button></div>
                  {itemSection===section._id && <div className="mb-5 border border-blue-200 bg-white p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold">{itemForm._id?"Edit Item":"Add Calculation / Cost Item"}</h3><button onClick={()=>setItemSection(null)}><X size={16}/></button></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <Field label="Description" value={itemForm.description} onChange={v=>setItemForm({...itemForm,description:v})} className="lg:col-span-2"/>
                    <SelectField label="Category" value={itemForm.category} options={["Material","Labor","Equipment","Other"]} onChange={v=>setItemForm({...itemForm,category:v as Item["category"],boqItemId:null})}/>
                    <Field label="Unit" value={itemForm.unit} onChange={v=>setItemForm({...itemForm,unit:v})}/>
                    <label className="block lg:col-span-2"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">BOQ Baseline</span><select value={itemForm.boqItemId||""} onChange={e=>{const id=e.target.value;const b=boqItems.find(x=>x._id===id);setItemForm({...itemForm,boqItemId:id||null,unit:b?.unit||itemForm.unit,unitCost:b?.unitCost??itemForm.unitCost,description:b?.description||itemForm.description,quantity:b?.quantity??itemForm.quantity})}} className="mt-1.5 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"><option value="">No BOQ link</option>{boqItems.filter(b=>b.category===({Material:"Materials",Labor:"Labor",Equipment:"Equipment",Other:"Other"} as Record<string,string>)[itemForm.category]).map(b=><option key={b._id} value={b._id}>{b.itemNo} · {b.description} · {money(Number(b.totalCost??b.quantity*b.unitCost))}</option>)}</select></label>
                    <Field label="Calculation / Formula" value={itemForm.calculation} onChange={v=>setItemForm({...itemForm,calculation:v})} className="md:col-span-2"/>
                    <Field label="Quantity" type="number" value={String(itemForm.quantity)} onChange={v=>setItemForm({...itemForm,quantity:Number(v)}}}/>
                    <Field label="Unit Cost" type="number" value={String(itemForm.unitCost)} onChange={v=>setItemForm({...itemForm,unitCost:Number(v)}}}/>
                    <Field label="Actual Cost" type="number" value={String(itemForm.actualCost)} onChange={v=>setItemForm({...itemForm,actualCost:Number(v)}}}/>
                  </div><div className="mt-3 flex justify-end"><button onClick={()=>saveItem(section)} className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2 text-xs font-bold text-white"><Save size={14}/> Save Item</button></div></div>}
                  <div className="overflow-x-auto border border-slate-200 bg-white"><table className="data-table min-w-[900px]"><thead><tr><th>BOQ</th><th>Description</th><th>Category</th><th>Planned Qty</th><th>Actual Qty</th><th>Qty Variance</th><th>Calculation</th><th className="text-right">Qty</th><th>Unit</th><th className="text-right">Unit Cost</th><th className="text-right">Estimated</th><th className="text-right">Actual</th><th className="text-right">Cost Variance</th><th></th></tr></thead><tbody>{section.items.length?section.items.map(item=><tr key={item._id}><td>{item.boqItemId?(boqItems.find(b=>b._id===item.boqItemId)?.itemNo||"Linked"):"—"}</td><td className="font-semibold">{item.description}</td><td>{item.category}</td><td className="tabular-nums">{Number(item.quantity||0).toLocaleString()} {item.unit}</td><td className="font-semibold tabular-nums">{item.boqItemId?`${Number(item.ledgerActualQuantity||0).toLocaleString()} ${item.unit}`:"—"}</td><td className={`font-semibold tabular-nums ${(item.ledgerQuantityVariance||0)<0?"text-red-600":"text-slate-700"}`}>{item.boqItemId?`${Number(item.ledgerQuantityVariance||0).toLocaleString()} ${item.unit}`:"—"}</td><td className="text-xs text-slate-500">{item.calculation||"—"}</td><td className="text-right tabular-nums">{item.quantity}</td><td>{item.unit||"—"}</td><td className="text-right tabular-nums">{money(item.unitCost)}</td><td className="text-right font-semibold tabular-nums">{money(Number(item.quantity||0)*Number(item.unitCost||0))}</td><td className="text-right tabular-nums">{money(item.boqItemId?Number(item.ledgerActualCost||0):Number(item.actualCost||0))}</td><td className={`text-right font-semibold tabular-nums ${(Number(item.quantity||0)*Number(item.unitCost||0)-(item.boqItemId?Number(item.ledgerActualCost||0):Number(item.actualCost||0)))<0?"text-red-600":"text-slate-700"}`}>{money(Number(item.quantity||0)*Number(item.unitCost||0)-(item.boqItemId?Number(item.ledgerActualCost||0):Number(item.actualCost||0)))} </td><td><div className="flex justify-end"><button title="Edit item" onClick={()=>editItem(section,item)} className="p-1.5 text-slate-400 hover:text-slate-800"><Pencil size={14}/></button><button title="Delete item" onClick={()=>removeItem(section,item._id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button></div></td></tr>):<tr><td colSpan={14} className="py-8 text-center text-sm text-slate-500">No calculation items yet.</td></tr>}</tbody><tfoot><tr><td colSpan={10} className="text-right font-bold">Section Total</td><td className="text-right font-bold">{money(estimated)}</td><td className="text-right font-bold">{money(actual)}</td><td className="text-right font-bold">{money(estimated-actual)}</td><td/></tr></table></div>
                </div>}
              </article>;
            })}
          </div>}
        </section>
      </div>

      {editing && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4"><form onSubmit={saveSection} className="w-full max-w-lg border border-slate-200 bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between border-b border-slate-200 pb-4"><div><div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Work Section</div><h2 className="mt-1 text-lg font-bold">Edit Section</h2></div><button type="button" onClick={()=>setEditing(null)}><X size={18}/></button></div><div className="space-y-4"><Field label="Section Name" value={editing.name} onChange={v=>setEditing({...editing,name:v})}/><Field label="Description" value={editing.description||""} onChange={v=>setEditing({...editing,description:v})}/><SelectField label="Status" value={editing.status} options={["Existing","Not Started","In Progress","Completed","On Hold","For Repair","Skipped"]} onChange={v=>setEditing({...editing,status:v})}/><Field label="Progress (%)" type="number" value={String(editing.progress)} onChange={v=>setEditing({...editing,progress:Math.max(0,Math.min(100,Number(v)))})}/></div><div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4"><button type="button" onClick={()=>setEditing(null)} className="border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2 text-sm font-bold text-white"><Save size={15}/>{saving?"Saving...":"Save Changes"}</button></div></form></div>}
    </main>
  );
}

function Summary({label,value}:{label:string;value:string}){return <div className="bg-white p-5"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</div></div>}
function Metric({label,value,danger=false}:{label:string;value:string;danger?:boolean}){return <div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className={`mt-1 font-bold tabular-nums ${danger?"text-red-600":"text-slate-900"}`}>{value}</div></div>}
function Field({label,value,onChange,type="text",className=""}:{label:string;value:string;onChange:(v:string)=>void;type?:string;className?:string}){return <label className={`block ${className}`}><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"/></label>}
function SelectField({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){return <label className="block"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600">{options.map(o=><option key={o}>{o}</option>)}</select></label>}

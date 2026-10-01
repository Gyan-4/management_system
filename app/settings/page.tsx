"use client";

import { useEffect, useState } from "react";
import { Check, Database, Loader2, Settings, AlertTriangle } from "lucide-react";

type CompanySettings = { name: string; address: string; engineer: string; contact: string };
const emptySettings: CompanySettings = { name: "", address: "", engineer: "", contact: "" };

export default function SettingsPage() {
  const [company, setCompany] = useState<CompanySettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/settings", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load settings.");
        const data = await response.json();
        setCompany({ name: data.name || "", address: data.address || "", engineer: data.engineer || "", contact: data.contact || "" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load settings.");
      } finally { setLoading(false); }
    }
    void load();
  }, []);

  async function save() {
    setSaving(true); setSaved(false); setError("");
    try {
      const response = await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(company) });
      if (!response.ok) throw new Error("Could not save settings.");
      const data = await response.json();
      setCompany({ name: data.name || "", address: data.address || "", engineer: data.engineer || "", contact: data.contact || "" });
      setSaved(true); window.setTimeout(() => setSaved(false), 2000);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not save settings."); }
    finally { setSaving(false); }
  }

  return <main className="min-h-screen p-5 md:p-8"><div className="mx-auto max-w-5xl">
    <div className="mb-6 border-b border-slate-200 pb-5"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">System / Configuration</div><h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1><p className="mt-1 text-sm text-slate-500">Configure firm information used across project documentation.</p></div>
    {error && <div className="mb-5 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={17} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
    <section className="border border-slate-200 bg-white"><div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5"><div className="border border-slate-200 bg-slate-50 p-2"><Settings size={18}/></div><div><h2 className="text-sm font-bold">Company Information</h2><p className="mt-1 text-xs text-slate-500">Stored in MongoDB so the settings persist across browsers and devices.</p></div></div>
      {loading ? <div className="flex items-center gap-2 p-8 text-sm text-slate-500"><Loader2 size={16} className="animate-spin"/> Loading settings...</div> : <div className="grid gap-5 p-6 md:grid-cols-2"><Field label="Company / Firm Name" value={company.name} onChange={v=>setCompany({...company,name:v})}/><Field label="Project Engineer" value={company.engineer} onChange={v=>setCompany({...company,engineer:v})}/><Field label="Office Address" value={company.address} onChange={v=>setCompany({...company,address:v})}/><Field label="Contact Information" value={company.contact} onChange={v=>setCompany({...company,contact:v})}/></div>}
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4"><button onClick={save} disabled={loading || saving} className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <><Loader2 size={16} className="animate-spin"/> Saving...</> : saved ? <><Check size={16}/> Saved</> : "Save Settings"}</button></div>
    </section>
    <section className="mt-5 border border-slate-200 bg-white"><div className="flex items-start gap-3 p-6"><Database size={19} className="mt-0.5 text-blue-600"/><div><h2 className="text-sm font-bold">Database Connection</h2><p className="mt-1 text-sm leading-6 text-slate-500">Production records are stored in MongoDB through the server API. Keep <code className="bg-slate-100 px-1.5 py-0.5 text-xs">MONGODB_URI</code> only in the deployment environment. Never expose the connection string in browser code.</p><div className="mt-4 border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">Connection configuration is server-side.</div></div></div></section>
  </div></main>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(value:string)=>void}){return <label className="block"><span className="text-sm font-semibold text-slate-700">{label}</span><input value={value} onChange={event=>onChange(event.target.value)} className="mt-1.5 w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"/></label>}

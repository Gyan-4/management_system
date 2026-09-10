"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, CalendarDays, MapPin, Plus, X } from "lucide-react";

type Project = {
  _id: string;
  name: string;
  client: string;
  location?: string;
  contractAmount: number;
  budget: number;
  startDate: string;
  endDate: string;
  status: string;
  projectManager?: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(n);

const emptyForm = {
  name: "",
  client: "",
  location: "",
  contractAmount: "",
  budget: "",
  startDate: "",
  endDate: "",
  status: "Planning",
  projectManager: "",
  description: "",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  async function loadProjects() {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error();
      setProjects(await response.json());
      setError("");
    } catch {
      setError("Could not load projects. Check your MongoDB connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setForm(emptyForm);
      setOpen(false);
      await loadProjects();
    } catch {
      setError("Could not create the project. Please check all fields.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-500">Manage construction projects, budgets, clients, and schedules.</p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            <Plus size={17} /> New Project
          </button>
        </div>

        {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="Total Projects" value={projects.length.toString()} />
          <Summary label="Active Projects" value={projects.filter((p) => p.status === "Active").length.toString()} />
          <Summary label="Total Contract Value" value={money(projects.reduce((sum, p) => sum + p.contractAmount, 0))} />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-sm text-gray-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="mx-auto text-gray-400" size={40} />
              <h2 className="mt-4 font-semibold">No projects yet</h2>
              <p className="mt-1 text-sm text-gray-500">Create your first project to start tracking costs.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project._id} className="p-5 hover:bg-gray-50">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <h2 className="truncate font-semibold text-gray-900">{project.name}</h2>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold">{project.status}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">Client: {project.client}</p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
                        {project.location && <span className="flex items-center gap-1"><MapPin size={13} />{project.location}</span>}
                        <span className="flex items-center gap-1"><CalendarDays size={13} />{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span>
                        {project.projectManager && <span>Engineer: {project.projectManager}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm sm:min-w-80">
                      <div><div className="text-xs text-gray-500">Contract Amount</div><div className="mt-1 font-semibold">{money(project.contractAmount)}</div></div>
                      <div><div className="text-xs text-gray-500">Estimated Budget</div><div className="mt-1 font-semibold">{money(project.budget)}</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={submit} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div><h2 className="text-xl font-bold">Create Project</h2><p className="mt-1 text-sm text-gray-500">Enter the basic project information.</p></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-gray-100"><X size={20} /></button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project Name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Client" required value={form.client} onChange={(v) => setForm({ ...form, client: v })} />
              <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
              <Field label="Project Engineer / Manager" value={form.projectManager} onChange={(v) => setForm({ ...form, projectManager: v })} />
              <Field label="Contract Amount" required type="number" value={form.contractAmount} onChange={(v) => setForm({ ...form, contractAmount: v })} />
              <Field label="Estimated Budget" required type="number" value={form.budget} onChange={(v) => setForm({ ...form, budget: v })} />
              <Field label="Start Date" required type="date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} />
              <Field label="End Date" required type="date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} />
              <label className="block"><span className="text-sm font-medium">Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-600"><option>Planning</option><option>Active</option><option>On Hold</option><option>Completed</option></select></label>
              <label className="block sm:col-span-2"><span className="text-sm font-medium">Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-600" /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold">Cancel</button><button disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Create Project"}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-5"><div className="text-sm text-gray-500">{label}</div><div className="mt-2 text-2xl font-bold">{value}</div></div>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="block"><span className="text-sm font-medium">{label}{required && " *"}</span><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-600" /></label>;
}

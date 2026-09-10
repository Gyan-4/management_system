"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Building2, ChevronDown, ClipboardList, FileText, LayoutDashboard, Menu, Package, Receipt, Settings, Truck, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

type Project = { _id: string; name: string };
const nav = [
  ["Overview", "/", LayoutDashboard], ["Projects", "/projects", Building2], ["BOQ", "/boq", ClipboardList], ["Materials", "/materials", Package], ["Labor", "/labor", Users], ["Equipment", "/equipment", Truck], ["Expenses", "/expenses", Receipt], ["Cost Analysis", "/cost-analysis", BarChart3], ["Progress", "/progress", BarChart3], ["Reports", "/reports", FileText],
] as const;

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const activeLabel = nav.find(([, href]) => href === "/" ? pathname === "/" : pathname.startsWith(href))?.[0] ?? "Project Control";
  const currentProject = projects.find(p => p._id === projectId);

  useEffect(() => {
    fetch("/api/projects", { cache: "no-store" }).then(r => r.ok ? r.json() : []).then(data => {
      if (!Array.isArray(data)) return;
      setProjects(data);
      const saved = window.localStorage.getItem("constructflow_project");
      if (saved && data.some((p: Project) => p._id === saved)) setProjectId(saved);
    }).catch(() => undefined);
  }, []);

  function selectProject(id: string) {
    setProjectId(id);
    window.localStorage.setItem("constructflow_project", id);
    setProjectOpen(false);
    if (pathname === "/" || pathname === "/projects") router.push(`/cost-analysis?projectId=${id}`);
  }

  return <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 md:px-7">
        <div className="flex min-w-0 items-center gap-7">
          <Link href="/" className="flex shrink-0 items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-[11px] font-black text-white">CF</span><span className="hidden text-[15px] font-bold tracking-tight text-slate-900 sm:block">ConstructFlow</span></Link>
          <div className="hidden h-6 w-px bg-slate-200 lg:block" />
          <div className="relative hidden lg:block">
            <button type="button" onClick={() => setProjectOpen(v => !v)} className="flex min-w-56 items-center justify-between gap-5 border border-slate-200 px-3 py-1.5 text-left hover:bg-slate-50">
              <div><div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project focus</div><div className="max-w-48 truncate text-xs font-semibold text-slate-700">{currentProject?.name || "All Projects"}</div></div><ChevronDown size={14} className="shrink-0 text-slate-400" />
            </button>
            {projectOpen && <div className="absolute left-0 top-[calc(100%+6px)] z-[80] w-72 border border-slate-200 bg-white p-1 shadow-xl"><button type="button" onClick={()=>{setProjectId("");window.localStorage.removeItem("constructflow_project");setProjectOpen(false);router.push("/projects");}} className={`block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${!projectId?"text-blue-700":"text-slate-600"}`}>All Projects</button>{projects.map(p=><button type="button" key={p._id} onClick={()=>selectProject(p._id)} className={`block w-full truncate px-3 py-2 text-left text-xs font-semibold hover:bg-slate-50 ${p._id===projectId?"bg-blue-50 text-blue-700":"text-slate-600"}`}>{p.name}</button>)}{projects.length===0&&<div className="px-3 py-2 text-xs text-slate-400">No projects available</div>}</div>}
          </div>
        </div>
        <div className="hidden items-center gap-4 md:flex"><div className="text-right"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</div><div className="text-xs font-semibold text-slate-700">Project Control</div></div><div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">CE</div></div>
        <button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-slate-100 md:hidden"><Menu size={21}/></button>
      </div>
      <nav className="hidden border-t border-slate-100 md:block"><div className="mx-auto flex max-w-[1600px] items-center gap-0 overflow-x-auto px-4 md:px-7">{nav.map(([label, href, Icon]) => { const active=href==="/"?pathname==="/":pathname.startsWith(href); return <Link key={label} href={href} className={`flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[12px] font-semibold transition ${active?"border-blue-600 text-blue-700":"border-transparent text-slate-500 hover:text-slate-900"}`}><Icon size={14} strokeWidth={active?2.2:1.8}/>{label}</Link>; })}<Link href="/settings" className={`ml-auto flex h-11 items-center gap-2 border-b-2 px-3 text-[12px] font-semibold ${pathname.startsWith("/settings")?"border-blue-600 text-blue-700":"border-transparent text-slate-500"}`}><Settings size={14}/>Settings</Link></div></nav>
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 md:hidden"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current module</div><div className="text-xs font-semibold text-slate-700">{activeLabel}</div></div>
    </header>
    {open&&<div className="fixed inset-0 z-[60] md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/40" onClick={()=>setOpen(false)}/><aside className="relative h-full w-80 bg-white shadow-2xl"><div className="flex h-16 items-center justify-between border-b border-slate-200 px-5"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 text-[11px] font-black text-white">CF</span><span className="text-sm font-bold">ConstructFlow</span></div><button onClick={()=>setOpen(false)} className="rounded p-2 hover:bg-slate-100"><X size={19}/></button></div><div className="p-3">{nav.map(([label,href,Icon])=>{const active=href==="/"?pathname==="/":pathname.startsWith(href);return <Link key={label} href={href} onClick={()=>setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold ${active?"bg-blue-50 text-blue-700":"text-slate-600 hover:bg-slate-50"}`}><Icon size={17}/>{label}</Link>})}<Link href="/settings" onClick={()=>setOpen(false)} className="mt-2 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><Settings size={17}/>Settings</Link></div></aside></div>}
  </>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, BarChart3, Building2, ClipboardList, FileText, LayoutDashboard, Menu, Package, Receipt, Settings, Truck, Users, X } from "lucide-react";

const groups = [
  { title: "WORKSPACE", items: [["Dashboard", "/", LayoutDashboard], ["Projects", "/projects", Building2]] },
  { title: "COST CONTROL", items: [["BOQ & Estimates", "/boq", ClipboardList], ["Materials", "/materials", Package], ["Labor & Payroll", "/labor", Users], ["Equipment", "/equipment", Truck], ["Other Expenses", "/expenses", Receipt]] },
  { title: "MONITORING", items: [["Cost Analysis", "/cost-analysis", BarChart3], ["Project Progress", "/progress", Activity], ["Reports", "/reports", FileText]] },
  { title: "SYSTEM", items: [["Settings", "/settings", Settings]] },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigation = (
    <div className="space-y-6 px-3 py-5">
      {groups.map((group) => (
        <div key={group.title}>
          <div className="mb-2 px-3 text-[10px] font-bold tracking-[0.14em] text-slate-500">{group.title}</div>
          <nav className="space-y-0.5">
            {group.items.map(([label, href, Icon]) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return <Link key={label} href={href} onClick={() => setOpen(false)} className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Icon size={16} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span></Link>;
            })}
          </nav>
        </div>
      ))}
    </div>
  );
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-slate-800 bg-slate-950 text-white md:block">
      <div className="border-b border-slate-800 px-5 py-5"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-black">CF</div><div><div className="text-[15px] font-bold tracking-tight">ConstructFlow</div><div className="text-[10px] text-slate-500">PROJECT CONTROL</div></div></div></div>
      {navigation}
      <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 p-4"><div className="rounded-md bg-slate-900 px-3 py-3"><div className="text-[10px] font-semibold text-slate-500">ENGINEERING WORKSPACE</div><div className="mt-1 text-xs text-slate-300">Cost & Project Management</div></div></div>
    </aside>
    <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs font-black text-white">CF</div><span className="text-sm font-bold">ConstructFlow</span></div><button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-slate-100"><Menu size={21}/></button></div>
    {open && <div className="fixed inset-0 z-[60] md:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)}/><aside className="relative h-full w-72 bg-slate-950 text-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div className="text-sm font-bold">Project Control</div><button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-slate-800"><X size={19}/></button></div>{navigation}</aside></div>}
  </>;
}

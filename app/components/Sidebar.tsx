"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, BarChart3, Building2, ClipboardList, LayoutDashboard, Menu, Package, Receipt, Settings, Truck, Users, X } from "lucide-react";

const nav = [
  ["Dashboard", "/", LayoutDashboard], ["Projects", "/projects", Building2], ["BOQ / Estimation", "/boq", ClipboardList],
  ["Materials", "/materials", Package], ["Labor & Payroll", "/labor", Users], ["Equipment", "/equipment", Truck], ["Expenses", "/expenses", Receipt],
  ["Cost Analysis", "/cost-analysis", BarChart3], ["Project Progress", "/progress", Activity], ["Reports", "/reports", BarChart3], ["Settings", "/settings", Settings],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = nav.map(([label, href, Icon]) => {
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return <Link key={label} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-white/10 font-semibold text-white" : "text-white/65 hover:bg-white/5 hover:text-white"}`}><Icon size={17} /><span>{label}</span></Link>;
  });

  return <>
    <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 overflow-y-auto text-white md:block">
      <Brand />
      <nav className="space-y-1 p-4">{links}</nav>
    </aside>

    <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm md:hidden">
      <div><div className="text-lg font-bold">ConstructFlow</div><div className="text-[10px] text-gray-500">Construction Management</div></div>
      <button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-gray-100"><Menu size={23} /></button>
    </div>

    {open && <div className="fixed inset-0 z-[60] md:hidden">
      <button aria-label="Close navigation" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <aside className="sidebar relative h-full w-72 overflow-y-auto text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10"><Brand /><button type="button" onClick={() => setOpen(false)} className="mr-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"><X size={21} /></button></div>
        <nav className="space-y-1 p-4">{links}</nav>
      </aside>
    </div>}
  </>;
}

function Brand() { return <div className="border-b border-white/10 px-6 py-5"><div className="text-xl font-bold">ConstructFlow</div><div className="mt-1 text-xs text-white/50">Construction Management</div></div>; }

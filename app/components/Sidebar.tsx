"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
} from "lucide-react";

const nav = [
  ["Dashboard", "/", LayoutDashboard],
  ["Projects", "/projects", Building2],
  ["BOQ / Estimation", "/boq", ClipboardList],
  ["Materials", "/materials", Package],
  ["Labor & Payroll", "/labor", Users],
  ["Equipment", "/equipment", Truck],
  ["Expenses", "/expenses", Receipt],
  ["Cost Analysis", "/cost-analysis", BarChart3],
  ["Project Progress", "/progress", Activity],
  ["Reports", "/reports", BarChart3],
  ["Settings", "/settings", Settings],
] as const;

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar fixed inset-y-0 left-0 z-40 hidden w-64 shrink-0 overflow-y-auto text-white md:block">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="text-xl font-bold">ConstructFlow</div>
        <div className="mt-1 text-xs text-white/50">Construction Management</div>
      </div>

      <nav className="space-y-1 p-4">
        {nav.map(([label, href, Icon]) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-white/10 font-semibold text-white"
                  : "text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import { usePathname } from "next/navigation";
import TopBar from "./TopBar";

export default function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <>
      {!isLogin && <TopBar />}
      <main
        className={
          isLogin
            ? "min-h-screen bg-slate-50"
            : "min-h-screen bg-slate-50 pt-[112px] md:pt-[116px]"
        }
      >
        {children}
      </main>
    </>
  );
}

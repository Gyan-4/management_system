import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./components/TopBar";
import { ProjectProvider } from "./components/ProjectContext";

export const metadata: Metadata = {
  title: "ConstructFlow | Construction Management",
  description: "Construction cost and project management system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          <TopBar />
          <main className="min-h-screen bg-slate-50 pt-[112px] md:pt-[116px]">{children}</main>
        </ProjectProvider>
      </body>
    </html>
  );
}

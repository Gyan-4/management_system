import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";
import { ProjectProvider } from "./components/ProjectContext";

export const metadata: Metadata = {
  title: "ConstructFlow | Construction Management",
  description: "Construction cost and project management system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          <AppShell>{children}</AppShell>
        </ProjectProvider>
      </body>
    </html>
  );
}

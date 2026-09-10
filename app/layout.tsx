import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "ConstructFlow | Construction Management",
  description: "Construction cost and project management system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="min-h-screen pt-16 md:pl-64 md:pt-0">{children}</div>
      </body>
    </html>
  );
}

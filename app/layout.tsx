import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConstructFlow | Construction Management",
  description: "Construction cost and project management system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

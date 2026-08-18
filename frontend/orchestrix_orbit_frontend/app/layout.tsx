import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchestrix - Research Workspace",
  description: "Privacy Preserving Collaborative Resource and Task Orchestrator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f8f9fa] text-black font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

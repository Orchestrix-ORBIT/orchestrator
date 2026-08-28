import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TenantProvider } from "@/context/TenantContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Orchestrix ORBIT — Research Collaboration Platform",
  description:
    "A secure, multi-tenant platform for research teams. Manage projects, tasks, resources, and AI-powered document summaries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-[#FAFAFA] text-[#121212] font-sans antialiased" suppressHydrationWarning>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}

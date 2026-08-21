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
  title: "Orchestrix ORBIT — Privacy-Preserving Research Collaboration",
  description:
    "A secure, multi-tenant platform for research teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#FAFAFA] text-[#121212] font-sans antialiased">
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}

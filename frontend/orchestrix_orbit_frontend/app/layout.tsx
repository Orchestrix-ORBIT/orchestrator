import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TenantProvider } from "@/context/TenantContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-next",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jb",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Orchestrix ORBIT — Research Collaboration Platform",
  description:
    "A secure, multi-tenant platform for research teams. Manage projects, tasks, resources, and AI-powered document summaries.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <TenantProvider>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}

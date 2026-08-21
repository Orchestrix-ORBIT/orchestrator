/* ── /dashboard/layout.tsx ───────────────────────────────────────────────────
   Minimal passthrough layout for the /dashboard route group.
   Each role owns its own layout:
     /dashboard/researcher/layout.tsx  ← Researcher (this sprint)
     /dashboard/admin/layout.tsx       ← To be added by team
     /dashboard/lab-manager/layout.tsx ← To be added by team
────────────────────────────────────────────────────────────────────────────── */
export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { redirect } from "next/navigation";

/* ── /dashboard → redirect to researcher dashboard ───────────────────────── */
export default function DashboardRootPage() {
  redirect("/dashboard/researcher");
}

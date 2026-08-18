import Sidebar from "@/components/layout/Sidebar";
import { Lock, UserCircle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#f8f9fa]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen bg-[#f8f9fa]">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#e5e5e5] px-8 flex justify-between items-center shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-5">
            <button className="text-[#525252] hover:text-black transition-colors" title="Security Status">
              <Lock className="w-5 h-5 stroke-[1.75]" />
            </button>
            <button className="text-[#525252] hover:text-black transition-colors" title="User Profile">
              <UserCircle className="w-5 h-5 stroke-[1.75]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

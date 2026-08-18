"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Package,
  MessageSquare,
  FileText,
  Sparkles,
  Bell,
  Lock,
  Settings,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/projects", icon: FolderOpen, label: "My Projects" },
    { href: "/tasks", icon: CheckSquare, label: "My Tasks" },
    { href: "/resources", icon: Package, label: "Resources" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/documents", icon: FileText, label: "Documents" },
    { href: "/ai-summaries", icon: Sparkles, label: "AI Summaries" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
  ];

  return (
    <aside className="w-[240px] h-screen fixed left-0 top-0 bg-[#111111] text-white flex flex-col py-6 px-3 border-r border-[#222222] z-20">
      {/* Brand Header */}
      <div className="px-3 mb-6">
        <h1 className="text-[18px] font-bold text-white tracking-tight leading-none">Orchestrix</h1>
        <p className="text-[12px] text-[#a3a3a3] mt-1 font-normal">Research Workspace</p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-colors ${
                isActive
                  ? "bg-[#262626] text-white font-semibold"
                  : "text-[#a3a3a3] hover:text-white hover:bg-white/5 font-medium"
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Area */}
      <div className="pt-4 border-t border-[#222222] flex flex-col gap-1">
        <button className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1c1c1c] border border-[#333333] rounded-md text-white text-[12px] font-medium hover:bg-[#262626] transition-colors mb-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Encrypted Session</span>
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-[13px] text-[#a3a3a3] hover:text-white hover:bg-white/5 font-medium transition-colors"
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}

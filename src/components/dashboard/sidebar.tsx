"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, LayoutDashboard, LogOut, Mic, Settings, Shield, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/setup", label: "New Interview", icon: Mic },
  { href: "/dashboard/resume", label: "Resume", icon: Upload },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function DashboardSidebar({
  userName,
  userEmail,
  isAdmin,
}: {
  userName?: string | null;
  userEmail?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-950/80 p-5 backdrop-blur">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Mock Interview</p>
        <h2 className="mt-1 text-lg font-semibold text-white">AI Platform</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {links
          .filter((link) => !link.adminOnly || isAdmin)
          .map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active ? "bg-blue-600/20 text-blue-300" : "text-zinc-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="truncate text-sm font-medium text-white">{userName ?? "User"}</p>
          <p className="truncate text-xs text-zinc-500">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

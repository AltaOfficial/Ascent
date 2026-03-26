"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { icon: "○", label: "Home",      href: "/" },
  { icon: "■", label: "Dashboard", href: "/dashboard" },
];

const SUBNAV = [
  { label: "Inbox",    href: "/dashboard/tasks" },
  { label: "Projects", href: "/dashboard/tasks/projects" },
];

const NAV2 = [
  { icon: "□", label: "Calendar",   href: "/dashboard/calendar" },
  { icon: "◆", label: "Compliance", href: "/dashboard/compliance" },
  { icon: "▲", label: "Analytics",  href: "/dashboard/analytics" },
  { icon: "◇", label: "Advisory",   href: "/dashboard/advisory" },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [tasksOpen, setTasksOpen] = useState(true);

  return (
    <aside
      className="flex flex-col shrink-0 border-r h-screen overflow-hidden"
      style={{ width: 188, background: "var(--bg)", borderColor: "var(--border)" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-4.5 py-5 border-b mb-4"
        style={{ borderColor: "var(--border)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" style={{ height: 18, width: "auto" }} />
        <span
          className="text-sm font-semibold tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        >
          Ascent
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 overflow-y-auto">
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={onClose} />
        ))}

        {/* Tasks collapsible */}
        <div className="mt-2">
          <button
            onClick={() => setTasksOpen((o) => !o)}
            className="flex items-center justify-between w-full px-4.5 py-1.75 text-[12px] tracking-[0.02em] transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="flex items-center gap-2.5">
              <span className="text-[11px] opacity-50">□</span>
              Tasks
            </span>
            <span className="text-[9px]">{tasksOpen ? "▾" : "▸"}</span>
          </button>
          {tasksOpen && (
            <div>
              {SUBNAV.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  onClick={onClose}
                  className="block pl-10 pr-4 py-1.75 text-[11px] tracking-[0.02em] transition-colors hover:text-text-mid"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {NAV2.map((item) => (
          <NavItem key={item.href} {...item} active={pathname === item.href} onClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div
        className="flex items-center gap-2.5 px-4.5 py-3.5 border-t mt-auto"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-center w-6.5 h-6.5 rounded-full border shrink-0 text-[10px]"
          style={{ background: "var(--surface-2)", borderColor: "var(--border-mid)", color: "var(--text-mid)" }}
        >
          JF
        </div>
        <span className="text-[11px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          Jaedon Farr
        </span>
      </div>
    </aside>
  );
}

function NavItem({
  icon, label, href, active, onClick,
}: {
  icon: string; label: string; href: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2.5 px-4.5 py-1.75 text-[12px] tracking-[0.02em] transition-colors",
        active ? "text-text-primary" : "text-text-secondary hover:text-text-mid"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r"
          style={{ background: "var(--text-primary)" }}
        />
      )}
      <span className={cn("text-[11px] flex items-center justify-center w-3.5", active ? "opacity-80" : "opacity-50")}>
        {icon}
      </span>
      {label}
    </Link>
  );
}

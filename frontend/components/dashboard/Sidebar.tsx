"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
];

const SUBNAV = [
  { label: "Inbox",    href: "/dashboard/tasks",          exact: true },
  { label: "Projects", href: "/dashboard/tasks/projects", exact: false },
];

const NAV2 = [
  { label: "Calendar",   href: "/dashboard/calendar" },
  { label: "Compliance", href: "/dashboard/compliance" },
  { label: "Analytics",  href: "/dashboard/analytics" },
  { label: "Advisory",   href: "/dashboard/advisory" },
];

export default function Sidebar({ onClose, user }: { onClose?: () => void; user?: { firstName: string; lastName: string } | null }) {
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
            className="flex items-center justify-between w-full px-4.5 py-2 text-[13px] tracking-[0.02em] transition-all duration-150 rounded-none"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              (e.currentTarget as HTMLElement).style.textShadow = "0 0 12px rgba(232,232,232,0.25)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              (e.currentTarget as HTMLElement).style.textShadow = "none";
            }}
          >
            <span>Tasks</span>
            <span className="text-[9px]" style={{ opacity: 0.5 }}>{tasksOpen ? "▾" : "▸"}</span>
          </button>
          {tasksOpen && (
            <div>
              {SUBNAV.map((s) => {
                const active = s.exact ? pathname === s.href : (pathname === s.href || pathname.startsWith(s.href + "/"));
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={onClose}
                    className="relative block pl-8 pr-4 py-2 text-[13px] tracking-[0.02em] transition-all duration-150"
                    style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)", textShadow: "none" }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                        (e.currentTarget as HTMLElement).style.textShadow = "0 0 12px rgba(232,232,232,0.25)";
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = active ? "var(--text-primary)" : "var(--text-secondary)";
                      (e.currentTarget as HTMLElement).style.textShadow = "none";
                    }}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r"
                        style={{ background: "var(--text-primary)" }}
                      />
                    )}
                    {s.label}
                  </Link>
                );
              })}
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
          {user ? `${user.firstName[0]}${user.lastName[0]}` : "—"}
        </div>
        <span className="text-[13px] tracking-[0.02em]" style={{ color: "var(--text-secondary)" }}>
          {user ? `${user.firstName} ${user.lastName}` : ""}
        </span>
      </div>
    </aside>
  );
}

function NavItem({
  label, href, active, onClick,
}: {
  label: string; href: string; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="relative flex items-center px-4.5 py-2 text-[13px] tracking-[0.02em] transition-all duration-150"
      style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)", textShadow: "none" }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          (e.currentTarget as HTMLElement).style.textShadow = "0 0 12px rgba(232,232,232,0.25)";
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = active ? "var(--text-primary)" : "var(--text-secondary)";
        (e.currentTarget as HTMLElement).style.textShadow = "none";
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3.5 rounded-r"
          style={{ background: "var(--text-primary)" }}
        />
      )}
      {label}
    </Link>
  );
}

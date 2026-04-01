"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "./Sidebar";
import { apiFetch } from "@/lib/api";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
  } | null>(null);

  useEffect(() => {
    apiFetch<{ firstName: string; lastName: string }>("/users/me")
      .then(setUser)
      .catch(() => {});
  }, []);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} user={user} />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="flex items-center justify-between px-4 py-3 border-b lg:hidden shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1 p-1"
            aria-label="Open menu"
          >
            <span
              className="block w-4 h-px"
              style={{ background: "var(--text-secondary)" }}
            />
            <span
              className="block w-4 h-px"
              style={{ background: "var(--text-secondary)" }}
            />
            <span
              className="block w-4 h-px"
              style={{ background: "var(--text-secondary)" }}
            />
          </button>
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" style={{ height: 16, width: "auto" }} />
            <span
              className="text-sm font-semibold tracking-[-0.01em]"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--text-primary)",
              }}
            >
              Ascent
            </span>
          </Link>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
      </div>
    </div>
  );
}

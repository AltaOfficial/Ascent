"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const fieldStyle = {
  background: "var(--surface-2)",
  borderColor: "var(--border)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
} as React.CSSProperties;

type UserSettings = {
  timezone: string;
  weekStart: string;
};

export default function SettingsPage() {
  const [timezone, setTimezone] = useState("UTC");
  const [weekStart, setWeekStart] = useState("monday");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiFetch<UserSettings>("/users/me")
      .then((user) => {
        setTimezone(user.timezone ?? "UTC");
        setWeekStart(user.weekStart ?? "monday");
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await apiFetch("/users/settings", {
        method: "POST",
        body: JSON.stringify({ timezone, weekStart }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="flex-1 overflow-y-auto p-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-xl font-semibold tracking-[-0.02em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            Settings
          </h1>
          <p className="text-[12px]" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            Preferences and defaults
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <section
            className="rounded-xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border-mid)" }}
          >
            <div
              className="text-[9px] tracking-[0.08em] uppercase mb-4"
              style={{ color: "var(--text-secondary)" }}
            >
              Time
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[12px] tracking-[0.01em]" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    Timezone
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)", opacity: 0.6, fontFamily: "var(--font-mono)" }}>
                    Used for calendar and compliance windows
                  </div>
                </div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="rounded-md border px-2.5 py-1.5 text-[11px] outline-none shrink-0"
                  style={{ ...fieldStyle, width: 210 }}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[12px] tracking-[0.01em]" style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    Week starts on
                  </div>
                </div>
                <select
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="rounded-md border px-2.5 py-1.5 text-[11px] outline-none shrink-0"
                  style={{ ...fieldStyle, width: 210 }}
                >
                  <option value="monday">Monday</option>
                  <option value="sunday">Sunday</option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[11px] font-medium px-5 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
              style={{
                background: saved ? "rgba(107,187,138,0.15)" : "var(--text-primary)",
                color: saved ? "rgba(107,187,138,0.9)" : "var(--bg)",
                border: saved ? "1px solid rgba(107,187,138,0.3)" : "none",
                fontFamily: "var(--font-mono)",
              }}
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

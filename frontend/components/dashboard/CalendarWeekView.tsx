"use client";

import { addDays, startOfWeek } from "date-fns";
import { CalEvent, SelectedDay, TYPE_COLOR, buildDateKey, getTodayKey } from "@/components/dashboard/calendarTypes";

const HOUR_SLOTS: undefined[] = Array.from({ length: 24 });
const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

export function CalendarWeekView({
  currentDate,
  getEventsForDate,
  onDayClick,
}: {
  currentDate: Date;
  getEventsForDate: (dateKey: string) => CalEvent[];
  onDayClick: (day: SelectedDay) => void;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const todayKey = getTodayKey();

  return (
    <div className="border rounded-lg overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="flex">
        {/* Time labels column */}
        <div className="w-[52px] shrink-0">
          <div className="h-19 border-b border-r" style={{ borderColor: "var(--border)" }} />
          {HOUR_SLOTS.map((_, hourIndex) => (
            <div
              key={hourIndex}
              className="h-[52px] border-b border-r flex items-start justify-end pr-2.5 pt-0.5"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="text-[10px] tracking-[0.03em] whitespace-nowrap"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatHour(hourIndex)}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex flex-1 overflow-x-auto">
          {Array.from({ length: 7 }, (_, dayOffset) => {
            const columnDate = addDays(weekStart, dayOffset);
            const dateKey = buildDateKey(
              columnDate.getFullYear(),
              columnDate.getMonth(),
              columnDate.getDate()
            );
            const isToday = dateKey === todayKey;
            const dayEvents = getEventsForDate(dateKey);
            const timedEvents = dayEvents.filter((event) => event.time && event.type !== "birthday");
            const allDayEvents = dayEvents.filter((event) => !event.time || event.type === "birthday");

            return (
              <div
                key={dateKey}
                className="flex-1 border-l"
                style={{ borderColor: "var(--border)", position: "relative" }}
              >
                {/* Day header */}
                <div
                  className="h-[76px] flex flex-col items-center justify-center border-b gap-0.5 sticky top-0 z-10"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                >
                  <span
                    className="text-[10px] tracking-[0.07em] uppercase"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {DAY_NAMES_SHORT[(dayOffset + 1) % 7]}
                  </span>
                  {isToday ? (
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[15px] font-semibold"
                      style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-display)" }}
                    >
                      {columnDate.getDate()}
                    </span>
                  ) : (
                    <span
                      className="text-[16px] font-semibold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
                    >
                      {columnDate.getDate()}
                    </span>
                  )}
                  <div className="flex flex-col gap-0.5 w-full px-1 mt-0.5">
                    {allDayEvents.slice(0, 1).map((event) => (
                      <div
                        key={event.id}
                        className="text-[9px] px-1 py-0.5 rounded-[3px] truncate"
                        style={{ background: TYPE_COLOR[event.type].bg, color: TYPE_COLOR[event.type].text }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hour grid */}
                <div
                  className="relative"
                  style={{ height: 24 * 52 }}
                  onClick={() =>
                    onDayClick({
                      year: columnDate.getFullYear(),
                      month: columnDate.getMonth(),
                      day: columnDate.getDate(),
                    })
                  }
                >
                  {HOUR_SLOTS.map((_, hourIndex) => (
                    <div
                      key={hourIndex}
                      className="border-b"
                      style={{ height: 52, borderColor: "var(--border)" }}
                    />
                  ))}
                  {timedEvents.map((event) => {
                    const [eventHour, eventMinute] = event.time.split(":").map(Number);
                    const topOffset = eventHour * 52 + (eventMinute / 60) * 52;
                    return (
                      <div
                        key={event.id}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation();
                          onDayClick({
                            year: columnDate.getFullYear(),
                            month: columnDate.getMonth(),
                            day: columnDate.getDate(),
                          });
                        }}
                        className="absolute left-0.75 right-0.75 rounded-[4px] px-1.5 py-1 text-[10px] leading-snug border-l-2 overflow-hidden"
                        style={{
                          top: topOffset,
                          height: 46,
                          background: TYPE_COLOR[event.type].bg,
                          color: TYPE_COLOR[event.type].text,
                          borderColor: TYPE_COLOR[event.type].text,
                          cursor: "pointer",
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="opacity-70">{event.time}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

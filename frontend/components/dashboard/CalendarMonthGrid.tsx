"use client";

import { getDaysInMonth, getDay } from "date-fns";
import { CalEvent, SelectedDay, TYPE_COLOR, buildDateKey, getTodayKey } from "@/components/dashboard/calendarTypes";

export function CalendarMonthGrid({
  currentDate,
  getEventsForDate,
  onDayClick,
}: {
  currentDate: Date;
  getEventsForDate: (dateKey: string) => CalEvent[];
  onDayClick: (day: SelectedDay) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfWeek = getDay(new Date(year, month, 1));
  const startOffset = (firstDayOfWeek + 6) % 7; // Monday = 0
  const daysInCurrentMonth = getDaysInMonth(new Date(year, month));
  const daysInPrevMonth = getDaysInMonth(new Date(year, month - 1));
  const totalCells = Math.ceil((startOffset + daysInCurrentMonth) / 7) * 7;
  const todayKey = getTodayKey();
  const cells = [];

  for (let cellIndex = 0; cellIndex < totalCells; cellIndex++) {
    let cellDay: number;
    let cellMonth = month;
    let cellYear = year;
    let isOtherMonth = false;

    if (cellIndex < startOffset) {
      cellDay = daysInPrevMonth - startOffset + cellIndex + 1;
      cellMonth = month - 1;
      isOtherMonth = true;
      if (cellMonth < 0) { cellMonth = 11; cellYear = year - 1; }
    } else if (cellIndex >= startOffset + daysInCurrentMonth) {
      cellDay = cellIndex - startOffset - daysInCurrentMonth + 1;
      cellMonth = month + 1;
      isOtherMonth = true;
      if (cellMonth > 11) { cellMonth = 0; cellYear = year + 1; }
    } else {
      cellDay = cellIndex - startOffset + 1;
    }

    const dateKey = buildDateKey(cellYear, cellMonth, cellDay);
    const isToday = dateKey === todayKey;
    const dayEvents = getEventsForDate(dateKey);
    const visibleEvents = dayEvents.slice(0, 2);

    cells.push(
      <div
        key={dateKey}
        onClick={() => onDayClick({ year: cellYear, month: cellMonth, day: cellDay })}
        className="border-r border-b min-h-27.5 p-2 transition-colors"
        style={{ borderColor: "var(--border)", background: "transparent", cursor: "pointer" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="mb-1.5">
          {isToday ? (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[13px] font-semibold"
              style={{ background: "var(--text-primary)", color: "var(--bg)", fontFamily: "var(--font-display)" }}
            >
              {cellDay}
            </span>
          ) : (
            <span
              className="text-[13px] font-medium"
              style={{
                fontFamily: "var(--font-display)",
                color: isOtherMonth ? "var(--text-secondary)" : "var(--text-primary)",
                opacity: isOtherMonth ? 0.35 : 1,
              }}
            >
              {cellDay}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {visibleEvents.map((event) => (
            <div
              key={event.id}
              className="text-[10px] px-1.5 py-0.5 rounded-[3px] truncate leading-[1.5] tracking-[0.01em]"
              style={{ background: TYPE_COLOR[event.type].bg, color: TYPE_COLOR[event.type].text }}
            >
              {event.time ? `${event.time} ` : ""}{event.title}
            </div>
          ))}
          {dayEvents.length > 2 && (
            <div className="text-[10px] pl-1.5" style={{ color: "var(--text-secondary)" }}>
              +{dayEvents.length - 2} more
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-7 mb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayLabel) => (
          <div
            key={dayLabel}
            className="text-center text-[10px] tracking-[0.08em] uppercase pb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {dayLabel}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-t border-l" style={{ borderColor: "var(--border)" }}>
        {cells}
      </div>
    </>
  );
}

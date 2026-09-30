import { Calendar as CalendarIcon } from "lucide-react";
import StaysCard from "./StaysCard";
import { cellStateFor } from "../utils/availability";
import { fromISODate } from "../utils/dates";
import { formatMoney } from "../utils/money";

/**
 * The availability calendar — a Sunday-first month grid laid out exactly like
 * the Experiences availability calendar: a seven-column header, weeks that
 * wrap, leading blanks for the first week, and no horizontal scrolling at any
 * width. Each cell is one calendar day for the selected room type, so the
 * room picker in the toolbar swaps the calendar's data the same way the
 * option picker swaps a tour's.
 *
 * Cell content: day number (hero), a small nightly-price line, status dot(s),
 * a capacity bar and the available/total room counter. Blocked and past days
 * show their state instead; overridden days carry the dark-green dot.
 */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_DOTS = {
  Available: ["bg-emerald-400"],
  Limited: ["bg-emerald-400", "bg-amber-400"],
  Full: ["bg-red-400"],
};

export default function AvailabilityCalendar({
  room,
  days,
  padStart = 0,
  overrides = {},
  todayIso,
  statusFilter = {},
  currency = "GHS",
  onCellClick,
  onResetFilters,
}) {
  if (!room) return null;

  const visibleDays = days.filter(
    (date) => statusFilter[cellStateFor(room, date, overrides, todayIso).key] !== false,
  );

  return (
    <StaysCard className="overflow-hidden border-slate-200 p-0">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="py-1.5 text-center text-[9px] font-semibold uppercase tracking-widest text-slate-400 sm:py-2 sm:text-[11px]"
          >
            {weekday}
          </div>
        ))}
      </div>

      {visibleDays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarIcon size={32} className="mb-2 text-slate-300" strokeWidth={1.5} />
          <p className="text-sm text-slate-400">No dates match the current filters</p>
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-2 text-xs text-[#044b3b] underline hover:text-[#033629]"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {Array.from({ length: padStart }).map((_, index) => (
            <div key={`pad-${index}`} className="bg-white" />
          ))}

          {days.map((date) => {
            const { key, override, available } = cellStateFor(room, date, overrides, todayIso);
            const filteredOut = statusFilter[key] === false;
            const isPast = key === "Past";
            const isBlocked = key === "Blocked";
            const isToday = date === todayIso;
            const hasOverride = Boolean(overrides[`${room.id}|${date}`]);
            const dots = STATUS_DOTS[key] || [];
            const availableToday =
              isToday && !isBlocked && !isPast && key === "Available";

            return (
              <button
                key={date}
                type="button"
                disabled={isPast || filteredOut}
                onClick={() => onCellClick?.({ room, date })}
                aria-label={`${room.name} · ${date} · ${key}`}
                className={`relative flex min-h-[60px] flex-col items-center border-b border-r border-slate-100 px-0.5 py-2 text-center transition-colors sm:min-h-[80px] sm:px-1 sm:py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/30 ${
                  filteredOut
                    ? "cursor-default bg-white opacity-20"
                    : isPast
                      ? "cursor-default bg-slate-50"
                      : isBlocked
                        ? "cursor-pointer bg-slate-50 hover:bg-slate-100"
                        : key === "Full"
                          ? "cursor-pointer bg-red-50 hover:bg-red-100"
                          : key === "Limited"
                            ? "cursor-pointer bg-amber-50 hover:bg-amber-100"
                            : "cursor-pointer bg-white hover:bg-slate-50 active:bg-slate-100"
                } ${availableToday ? "bg-emerald-50/40" : ""}`}
              >
                {hasOverride && !isPast && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#044b3b]" />
                )}

                <span
                  className={`text-xs font-semibold leading-none sm:text-sm ${
                    availableToday
                      ? "text-[#044b3b]"
                      : isPast
                        ? "text-slate-300"
                        : isBlocked || key === "Full"
                          ? "text-slate-400"
                          : key === "Limited"
                            ? "text-amber-600"
                            : "text-slate-700"
                  }`}
                >
                  {fromISODate(date).getDate()}
                </span>

                {isBlocked ? (
                  <span className="mt-1.5 text-[8px] font-medium uppercase tracking-wider leading-none text-slate-400 sm:mt-2 sm:text-[9px]">
                    Blocked
                  </span>
                ) : isPast ? (
                  <span className="mt-1.5 text-[8px] font-medium uppercase tracking-wider leading-none text-slate-300 sm:mt-2 sm:text-[9px]">
                    Past
                  </span>
                ) : (
                  <>
                    <span className="mt-1 text-[9px] leading-none text-slate-400 sm:text-[10px]">
                      {formatMoney(override.price ?? room.price, currency)}
                    </span>

                    {dots.length > 0 && (
                      <span className="mb-0.5 mt-1 flex items-center gap-0.5 sm:gap-1 sm:mb-1">
                        {dots.map((dot) => (
                          <span key={dot} className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${dot}`} />
                        ))}
                      </span>
                    )}

                    <div className="mt-1 hidden h-1 w-8 overflow-hidden rounded-full bg-slate-100 sm:block">
                      <div
                        className={`h-full rounded-full ${
                          key === "Limited" ? "bg-amber-400" : key === "Full" ? "bg-red-400" : "bg-emerald-400"
                        }`}
                        style={{
                          width: `${room.count > 0 ? Math.min(100, (available / room.count) * 100) : 0}%`,
                        }}
                      />
                    </div>

                    <span
                      className={`mt-1 text-[9px] leading-none sm:text-[10px] ${
                        key === "Limited"
                          ? "text-amber-700"
                          : key === "Full"
                            ? "text-red-500"
                            : "text-slate-400"
                      }`}
                    >
                      {available}/{room.count}
                      <span className="hidden sm:inline"> rooms</span>
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </StaysCard>
  );
}

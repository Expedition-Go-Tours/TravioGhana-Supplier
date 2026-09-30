import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Ban,
  BedDouble,
  Calendar as CalendarIcon,
  CalendarX2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysSeg from "../components/StaysSeg";
import StaysEmptyState from "../components/StaysEmptyState";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import AvailabilityCellPanel from "../components/AvailabilityCellPanel";
import { usePropertyContext } from "../hooks/usePropertyContext";
import { cellStateFor } from "../utils/availability";
import {
  clearAvailabilityCell,
  getAvailability,
  setAvailabilityCell,
  STAYS_KEYS,
} from "../api";
import {
  monthRangeFor,
  shiftISODays,
  shiftISOMonths,
  todayISO,
  weekRangeFor,
} from "../utils/dates";

/**
 * Availability — the calendar page, built on the Experiences availability
 * layout: property picker + date-mode control + chevron navigation in one
 * toolbar card; status tiles with share bars; filter chips with the override
 * legend; and a room × date calendar whose cells open the slide-over editor.
 *
 * The anchor date lives in `?date=` (the property already lives in
 * `?property=`), so a refresh or a shared link opens the same month.
 */

const STATUS_ORDER = ["Available", "Limited", "Full", "Blocked", "Past"];

const STATUS_TILES = {
  Available: {
    icon: CheckCircle2,
    tileBg: "bg-emerald-50",
    tileBorder: "border-emerald-200/60",
    color: "text-emerald-600",
    bar: "from-emerald-400 to-emerald-300",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  Limited: {
    icon: AlertTriangle,
    tileBg: "bg-amber-50",
    tileBorder: "border-amber-200/60",
    color: "text-amber-600",
    bar: "from-amber-400 to-amber-300",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  Full: {
    icon: XCircle,
    tileBg: "bg-red-50",
    tileBorder: "border-red-200/60",
    color: "text-red-600",
    bar: "from-red-400 to-red-300",
    chip: "border-red-200 bg-red-50 text-red-700",
  },
  Blocked: {
    icon: Ban,
    tileBg: "bg-slate-50",
    tileBorder: "border-slate-200/60",
    color: "text-slate-500",
    bar: "from-slate-400 to-slate-300",
    chip: "border-slate-200 bg-slate-50 text-slate-600",
  },
  Past: {
    icon: CalendarX2,
    tileBg: "bg-slate-50",
    tileBorder: "border-slate-200/60",
    color: "text-slate-400",
    bar: "from-slate-300 to-slate-200",
    chip: "border-slate-200 bg-slate-50 text-slate-500",
  },
};

export default function StaysAvailabilityPage() {
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [span, setSpan] = useState("Month");
  const [statusFilter, setStatusFilter] = useState({
    Available: true,
    Limited: true,
    Full: true,
    Blocked: true,
    Past: true,
  });
  const [cell, setCell] = useState(null); // { room, date, openKey }

  const today = todayISO();
  const anchor = searchParams.get("date") || today;

  const range = useMemo(
    () => (span === "Month" ? monthRangeFor(anchor) : weekRangeFor(anchor)),
    [span, anchor],
  );

  const { data, isLoading: loadingAvailability, isFetching } = useQuery({
    queryKey: STAYS_KEYS.availability(property?.id, range.from, range.to),
    queryFn: () => getAvailability(property?.id, { from: range.from, to: range.to }),
    enabled: Boolean(property?.id),
    staleTime: 15_000,
  });

  const overrides = useMemo(() => data?.overrides ?? {}, [data]);

  // The calendar shows one room type at a time (the room picker swaps it),
  // exactly like the Experiences calendar's option picker.
  const rooms = property?.rooms || [];
  const requestedRoomId = searchParams.get("room");
  const room = rooms.find((option) => option.id === requestedRoomId) || rooms[0] || null;

  const stats = useMemo(() => {
    const counts = { Available: 0, Limited: 0, Full: 0, Blocked: 0, Past: 0 };
    if (!room) return counts;
    for (const date of range.days) {
      counts[cellStateFor(room, date, overrides, today).key] += 1;
    }
    return counts;
  }, [room, range.days, overrides, today]);

  const totalCells = range.days.length || 1;

  const setAnchor = (iso) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("date", iso);
        return next;
      },
      { replace: true },
    );

  const setRoom = (roomId) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("room", roomId);
        return next;
      },
      { replace: true },
    );

  const changeProperty = (id) => {
    setCell(null);
    selectProperty(id);
    // A different property has different rooms — drop the stale selection.
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("room");
        return next;
      },
      { replace: true },
    );
  };

  const shiftPeriod = (direction) =>
    setAnchor(span === "Month" ? shiftISOMonths(anchor, direction) : shiftISODays(anchor, direction * 7));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["stays", "availability"] });

  const saveMutation = useMutation({
    mutationFn: ({ roomId, date, values }) => setAvailabilityCell(property.id, { roomId, date, values }),
    onSuccess: invalidate,
  });

  const clearMutation = useMutation({
    mutationFn: ({ roomId, date }) => clearAvailabilityCell(property.id, { roomId, date }),
    onSuccess: () => {
      invalidate();
      toast.success("Reset to the room defaults");
    },
  });

  const pending = saveMutation.isPending || clearMutation.isPending;

  const openCell = (next) => setCell({ ...next, openKey: Date.now() });

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Availability"
        subtitle={
          property
            ? `Manage room inventory and nightly prices for ${property.name}.`
            : "Manage when your rooms can be booked."
        }
      />

      {/* Controls */}
      <StaysCard className="mb-4 p-3 sm:px-5 sm:py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CalendarIcon size={16} className="shrink-0 text-slate-400" />
            <Select
              value={property?.id || ""}
              onValueChange={changeProperty}
            >
              <SelectTrigger
                aria-label="Selected property"
                className="min-w-0 flex-1 px-3 text-sm font-medium text-slate-900"
              >
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rooms.length > 0 && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <BedDouble size={16} className="shrink-0 text-slate-400" />
              <Select
                value={room?.id || ""}
                onValueChange={(id) => {
                  setCell(null);
                  setRoom(id);
                }}
              >
                <SelectTrigger
                  aria-label="Selected room"
                  className="min-w-0 flex-1 px-3 text-sm text-slate-700"
                >
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <StaysSeg
              variant="segmented"
              ariaLabel="Calendar span"
              options={[
                { value: "Month", label: "Month" },
                { value: "Week", label: "Week" },
              ]}
              value={span}
              onChange={setSpan}
            />

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => shiftPeriod(-1)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Previous period"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="w-28 select-none text-center text-sm font-semibold text-slate-800">
                {range.label}
              </span>
              <button
                type="button"
                onClick={() => shiftPeriod(1)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Next period"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAnchor(today)}
              className="rounded-md px-1.5 py-1 text-xs font-medium text-[#044b3b] transition-colors hover:bg-emerald-50 hover:text-[#033629]"
            >
              Today
            </button>

            {isFetching && <RefreshCw size={13} className="shrink-0 animate-spin text-slate-400" />}
          </div>
        </div>
      </StaysCard>

      {/* Status tiles */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {STATUS_ORDER.map((label) => {
          const cfg = STATUS_TILES[label];
          const Icon = cfg.icon;
          const value = stats[label];
          return (
            <div
              key={label}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:shadow-md sm:p-4"
            >
              <div className="flex items-start gap-2.5 sm:gap-3.5">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 sm:h-11 sm:w-11",
                    cfg.tileBg,
                    cfg.tileBorder,
                  )}
                >
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-xl font-bold tracking-tight sm:text-2xl", cfg.color)}>{value}</p>
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-400 sm:text-xs">{label}</p>
                </div>
              </div>
              <div
                className={cn(
                  "absolute bottom-0 left-0 h-1 rounded-full bg-linear-to-r transition-all duration-500 ease-out",
                  cfg.bar,
                )}
                style={{ width: value > 0 ? `${Math.min((value / totalCells) * 100, 100)}%` : "0%" }}
              />
            </div>
          );
        })}
      </div>

      {/* Status filter + override legend */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {STATUS_ORDER.map((label) => {
          const cfg = STATUS_TILES[label];
          const Icon = cfg.icon;
          const active = statusFilter[label];
          return (
            <button
              key={label}
              type="button"
              aria-pressed={active}
              onClick={() => setStatusFilter((previous) => ({ ...previous, [label]: !previous[label] }))}
              className={cn(
                "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-all sm:gap-1.5 sm:px-2.5 sm:text-xs",
                active ? cfg.chip : "border-transparent text-slate-300 hover:text-slate-400",
              )}
            >
              <Icon size={11} />
              {label}
            </button>
          );
        })}
        <span className="mx-0.5 hidden text-[11px] text-slate-300 sm:mx-1 sm:inline">|</span>
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#044b3b]" />
          <span className="text-[11px] text-slate-400">Override</span>
        </div>
      </div>

      {/* Calendar */}
      {isLoading || (property && loadingAvailability) ? (
        <StaysCard className="min-h-[300px] animate-pulse bg-white/60" />
      ) : !property ? (
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then manage its availability.
          </StaysEmptyState>
        </StaysCard>
      ) : rooms.length ? (
        <AvailabilityCalendar
          room={room}
          days={range.days}
          padStart={range.padStart}
          overrides={overrides}
          todayIso={today}
          statusFilter={statusFilter}
          currency={data?.currency}
          onCellClick={openCell}
          onResetFilters={() =>
            setStatusFilter({
              Available: true,
              Limited: true,
              Full: true,
              Blocked: true,
              Past: true,
            })
          }
        />
      ) : (
        <StaysCard>
          <StaysEmptyState title="No rooms yet">
            Add a room in the property builder to start managing availability.
          </StaysEmptyState>
        </StaysCard>
      )}

      <AvailabilityCellPanel
        key={cell?.openKey}
        open={Boolean(cell)}
        room={cell?.room}
        date={cell?.date}
        override={cell ? overrides[`${cell.room.id}|${cell.date}`] : undefined}
        todayIso={today}
        pending={pending}
        onClose={() => setCell(null)}
        onApply={(values, message) =>
          saveMutation.mutate(
            { roomId: cell.room.id, date: cell.date, values },
            { onSuccess: () => toast.success(message || "Availability updated") },
          )
        }
        onClear={() => clearMutation.mutate({ roomId: cell.room.id, date: cell.date })}
      />
    </StaysSurface>
  );
}

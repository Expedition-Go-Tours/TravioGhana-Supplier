import { useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Package,
  Clock,
  Users,
  Calendar as CalendarIcon,
  Undo2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CalendarX2,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
  addDays,
  parseISO,
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listMyProducts } from "@/features/products/api";
import {
  fetchTourAvailability,
  updateDateAvailability,
  removeDateOverride,
} from "@/features/availability/api";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CutoffSelect } from "@/features/products/CutoffSelect";
import { cutoffInstant, formatCutoffLabel } from "@/features/products/cutoffOptions";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const STATUS_CONFIG = {
  available: { label: "Available", dot: "bg-emerald-500", badge: "text-emerald-700 bg-emerald-50 border-emerald-200", bar: "bg-emerald-400", icon: CheckCircle2 },
  limited: { label: "Limited", dot: "bg-amber-500", badge: "text-amber-700 bg-amber-50 border-amber-200", bar: "bg-amber-400", icon: AlertTriangle },
  full: { label: "Full", dot: "bg-red-500", badge: "text-red-700 bg-red-50 border-red-200", bar: "bg-red-400", icon: XCircle },
  blocked: { label: "Blocked", dot: "bg-slate-300", badge: "text-slate-600 bg-slate-50 border-slate-200", bar: "bg-slate-300", icon: Ban },
  past: { label: "Past", dot: "bg-slate-200", badge: "text-slate-500 bg-slate-50 border-slate-200", bar: "bg-slate-200", icon: CalendarX2 },
};

const STATUS_ORDER = ["available", "limited", "full", "blocked", "past"];

const TOUR_STATUS_CONFIG = {
  ACTIVE: { label: "Active", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-500 border-slate-200" },
  PENDING_APPROVAL: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", className: "bg-red-50 text-red-600 border-red-200" },
  PAUSED: { label: "Paused", className: "bg-slate-50 text-slate-500 border-slate-200" },
  ARCHIVED: { label: "Archived", className: "bg-slate-50 text-slate-400 border-slate-200" },
};

function monthRange(date) {
  return {
    start: format(startOfMonth(date), "yyyy-MM-dd"),
    end: format(endOfMonth(date), "yyyy-MM-dd"),
  };
}

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tourFromUrl = searchParams.get("tour") || "";
  const dateFromUrl = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");

  const [currentDate, setCurrentDate] = useState(() => {
    try { return parseISO(dateFromUrl); } catch { return new Date(); }
  });
  const [selectedTour, setSelectedTour] = useState(tourFromUrl);
  const [selectedDate, setSelectedDate] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const panelTimer = useRef(null);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [capacityDraft, setCapacityDraft] = useState("");
  const [slotCutoffDrafts, setSlotCutoffDrafts] = useState({});
  const [defaultCutoffDraft, setDefaultCutoffDraft] = useState(20);
  const [statusFilter, setStatusFilter] = useState({ available: true, limited: true, full: true, blocked: true, past: true });
  const [dateMode, setDateMode] = useState("month");
  const [selectedOption, setSelectedOption] = useState("");

  const range = useMemo(() => {
    if (dateMode === "week") {
      const today = new Date();
      return { start: format(today, "yyyy-MM-dd"), end: format(addDays(today, 6), "yyyy-MM-dd") };
    }
    if (dateMode === "all") {
      return { start: format(subMonths(new Date(), 3), "yyyy-MM-dd"), end: format(addMonths(new Date(), 3), "yyyy-MM-dd") };
    }
    return monthRange(currentDate);
  }, [currentDate, dateMode]);

  const syncUrl = useCallback((tour, date) => {
    const p = {};
    if (tour) p.tour = tour;
    if (date) p.date = format(typeof date === "string" ? parseISO(date) : date, "yyyy-MM-dd");
    setSearchParams(p, { replace: true });
  }, [setSearchParams]);

  const closePanel = useCallback(() => {
    if (panelTimer.current) clearTimeout(panelTimer.current);
    setPanelVisible(false);
    panelTimer.current = setTimeout(() => setPanelOpen(false), 250);
  }, []);

  const handleTourChange = (val) => {
    setSelectedTour(val);
    setSelectedOption("");
    syncUrl(val, currentDate);
    closePanel();
  };

  const goMonth = (dir) => {
    const d = dir === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1);
    setCurrentDate(d);
    syncUrl(selectedTour, d);
  };

  const { data: toursData, isLoading: toursLoading, isError: toursError } = useQuery({
    queryKey: ["supplier-tours"],
    queryFn: async () => {
      const res = await listMyProducts({ limit: 100 });
      return res.data?.data?.tours || [];
    },
    select: (t) => t.map((x) => ({
      id: x.id,
      title: x.title,
      status: x.status,
      options: x.productContent?.options || x.options || [],
    })),
  });

  const tours = toursData || [];
  const validSelected = tours.some((t) => t.id === selectedTour);
  // A stale/invalid ?tour= id silently renders an empty "all available" calendar,
  // so resolve to the selected tour only when it actually exists in the list.
  const tourId = validSelected ? selectedTour : (tours.length > 0 ? tours[0].id : null);

  const activeTour = tours.find((t) => t.id === tourId) || null;
  const tourOptions = Array.isArray(activeTour?.options) ? activeTour.options : [];
  const showOptionPicker = tourOptions.length > 1;
  const optionId = showOptionPicker && selectedOption ? selectedOption : "";

  const { data: availData, isLoading: availLoading, isError: availError, refetch: refetchAvail } = useQuery({
    queryKey: ["tour-availability", tourId, range.start, range.end, optionId],
    queryFn: () => fetchTourAvailability(tourId, range.start, range.end, optionId || undefined),
    enabled: !!tourId,
  });

  const calendar = useMemo(() => availData?.calendar || [], [availData]);

  const getDay = useCallback((date) => {
    const key = format(date, "yyyy-MM-dd");
    return calendar.find((d) => d.date === key) || { status: "available", capacity: 0, booked: 0, remaining: 0, slots: [], hasOverride: false, overrideStatus: null, capacityUnit: "people", groupsPerSlot: null, maxGroupSize: null };
  }, [calendar]);

  const rangeDays = useMemo(() => {
    if (dateMode === "week") {
      const today = new Date();
      return eachDayOfInterval({ start: today, end: addDays(today, 6) });
    }
    if (dateMode === "all") {
      return eachDayOfInterval({ start: subMonths(new Date(), 3), end: addMonths(new Date(), 3) });
    }
    return eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  }, [currentDate, dateMode]);

  const visibleDays = useMemo(() => rangeDays.filter((d) => statusFilter[getDay(d).status]), [rangeDays, statusFilter, getDay]);

  const stats = useMemo(() => {
    const s = { available: 0, limited: 0, full: 0, blocked: 0, past: 0 };
    rangeDays.forEach((d) => { s[getDay(d).status]++; });
    return s;
  }, [rangeDays, getDay]);

  const totalDays = rangeDays.length;

  const blockMut = useMutation({
    mutationFn: ({ tourId, date, status, unblock }) =>
      unblock
        ? removeDateOverride(tourId, date)
        : updateDateAvailability(tourId, date, { status }),
    onSuccess: (_, vars) => { toast.success(vars?.unblock ? "Date unblocked" : "Date blocked"); queryClient.invalidateQueries({ queryKey: ["tour-availability", tourId] }); },
    onError: (e) => { toast.error(e.response?.data?.message || "Failed to update"); },
  });

  const revertMut = useMutation({
    mutationFn: ({ tourId, date }) => removeDateOverride(tourId, date),
    onSuccess: () => { toast.success("Reverted to template"); queryClient.invalidateQueries({ queryKey: ["tour-availability", tourId] }); },
    onError: (e) => { toast.error(e.response?.data?.message || "Failed to revert"); },
  });

  const capacityMut = useMutation({
    mutationFn: ({ tourId, date, capacity }) => updateDateAvailability(tourId, date, { capacity }),
    onSuccess: (_, vars) => {
      toast.success(vars.capacity === null ? "Day limit removed" : `Day limit set to ${vars.capacity}`);
      const day = getDay(parseISO(vars.date));
      setCapacityDraft(String(vars.capacity ?? day?.baseCapacity ?? ""));
      queryClient.invalidateQueries({ queryKey: ["tour-availability", tourId] });
    },
    onError: (e) => { toast.error(e.response?.data?.message || "Failed to update day limit"); },
  });

  const slotCutoffMut = useMutation({
    mutationFn: ({ tourId, date, slotCutoffs, cutoffMinutes }) =>
      updateDateAvailability(tourId, date, { slotCutoffs, cutoffMinutes }),
    onSuccess: (_, vars) => {
      toast.success(vars.slotCutoffs && Object.keys(vars.slotCutoffs).length > 0 ? "Cut-off times updated" : "Default cut-off updated");
      queryClient.invalidateQueries({ queryKey: ["tour-availability", tourId] });
    },
    onError: (e) => { toast.error(e.response?.data?.message || "Failed to update cut-off times"); },
  });

  const openPanel = useCallback((date) => {
    setSelectedDate(date);
    setConfirmingBlock(false);
    const day = getDay(date);
    setCapacityDraft(String(day.overrideCapacity ?? day.capacity ?? ""));
    const base = day.cutoffMinutes ?? 20;
    const drafts = {};
    (day.slots || []).forEach((s) => { drafts[s.time] = s.cutoffMinutes ?? base; });
    setDefaultCutoffDraft(base);
    setSlotCutoffDrafts(drafts);
    if (panelOpen) return;
    setPanelOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setPanelVisible(true)));
  }, [panelOpen, getDay]);

  const handleSlotCutoffChange = (time, minutes) =>
    setSlotCutoffDrafts((prev) => ({ ...prev, [time]: minutes }));

  const handleApplyDefaultToAllSlots = () =>
    setSlotCutoffDrafts((prev) => {
      const next = {};
      Object.keys(prev).forEach((t) => { next[t] = defaultCutoffDraft; });
      return next;
    });

  const handleSaveSlotCutoffs = () => {
    if (!selectedDate || !tourId) return;
    slotCutoffMut.mutate({
      tourId,
      date: format(selectedDate, "yyyy-MM-dd"),
      slotCutoffs: slotCutoffDrafts,
      cutoffMinutes: defaultCutoffDraft,
    });
  };

  const handleRevert = () => {
    if (!selectedDate || !tourId) return;
    revertMut.mutate({ tourId, date: format(selectedDate, "yyyy-MM-dd") });
    closePanel();
  };

  const handleBlockAction = () => {
    if (!selectedDate || !tourId) return;
    if (selectedDay?.status === "blocked") {
      // Unblocking is non-destructive — just drop the override.
      blockMut.mutate({ tourId, date: format(selectedDate, "yyyy-MM-dd"), status: "BLOCKED", unblock: true });
      closePanel();
    } else {
      setConfirmingBlock(true);
    }
  };

  const handleBlockConfirm = () => {
    if (!selectedDate || !tourId || !selectedDay) return;
    blockMut.mutate({ tourId, date: format(selectedDate, "yyyy-MM-dd"), status: "BLOCKED", unblock: false });
    setConfirmingBlock(false);
    closePanel();
  };

  const handleCapacityApply = () => {
    if (!selectedDate || !tourId || !selectedDay) return;
    const raw = String(capacityDraft).trim();
    if (!raw) return;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 100000) {
      toast.error("Enter a whole number between 1 and 100,000");
      return;
    }
    if (value < selectedDay.booked) {
      const unit = selectedDay.capacityUnit === "groups"
        ? (selectedDay.booked === 1 ? "group" : "groups") + " already booked"
        : "bookings already booked";
      toast.error(`Can't go below ${selectedDay.booked} ${unit}`);
      return;
    }
    capacityMut.mutate({ tourId, date: format(selectedDate, "yyyy-MM-dd"), capacity: value });
  };

  const handleCapacityClear = () => {
    if (!selectedDate || !tourId) return;
    capacityMut.mutate({ tourId, date: format(selectedDate, "yyyy-MM-dd"), capacity: null });
  };

  const selectedDay = selectedDate ? getDay(selectedDate) : null;
  const cfg = selectedDay ? STATUS_CONFIG[selectedDay.status] || STATUS_CONFIG.available : null;
  const pending = blockMut.isPending || revertMut.isPending;

  const effectiveCapacity = selectedDay ? (selectedDay.overrideCapacity ?? selectedDay.capacity) : 0;
  const capacityDirty = !!selectedDay && String(capacityDraft).trim() !== "" && Number(capacityDraft) !== effectiveCapacity;

  const slotCutoffsDirty = useMemo(() => {
    if (!selectedDay || !selectedDay.slots?.length) return false;
    const base = selectedDay.cutoffMinutes ?? 20;
    if (defaultCutoffDraft !== base) return true;
    return selectedDay.slots.some((s) => (slotCutoffDrafts[s.time] ?? base) !== (s.cutoffMinutes ?? base));
  }, [selectedDay, slotCutoffDrafts, defaultCutoffDraft]);

  const padStart = dateMode === "month" ? startOfMonth(currentDate).getDay() : 0;

  // ====== LOADING / ERROR / EMPTY ======
  if (toursLoading) return <div className="p-6 flex items-center justify-center min-h-[60vh]"><LoadingSpinner /></div>;

  if (toursError) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle size={40} className="text-red-500" />
      <p className="text-slate-500">Failed to load tours</p>
      <button onClick={() => queryClient.invalidateQueries({ queryKey: ["supplier-tours"] })} className="flex items-center gap-2 px-4 py-2 bg-[#044b3b] text-white rounded-lg text-sm hover:bg-[#033629]"><RefreshCw size={14} /> Retry</button>
    </div>
  );

  if (tours.length === 0) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="mb-4 p-4 bg-slate-50 rounded-full"><Package size={56} className="text-slate-400" strokeWidth={1.5} /></div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Tours Yet</h3>
      <p className="text-slate-500 max-w-md">Create a tour first to manage its availability.</p>
    </div>
  );

  if (availError) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <AlertCircle size={40} className="text-red-500" />
      <p className="text-slate-500">Failed to load availability for this tour</p>
      <button onClick={() => refetchAvail()} className="flex items-center gap-2 px-4 py-2 bg-[#044b3b] text-white rounded-lg text-sm hover:bg-[#033629]"><RefreshCw size={14} /> Retry</button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Availability</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage when your tours can be booked</p>
        </div>
      </div>

      {/* ====== CONTROLS ====== */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:px-5 sm:py-3 mb-6 space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon size={16} className="text-slate-400 shrink-0" />
          <Select value={tourId || ""} onValueChange={handleTourChange}>
            <SelectTrigger className="flex-1 min-w-0 px-3 text-sm font-medium text-slate-900">
              <SelectValue placeholder="Select a tour" />
            </SelectTrigger>
            <SelectContent>
              {tours.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center justify-between gap-2 min-w-0">
                    <span className="truncate">{t.title}</span>
                    {t.status !== "ACTIVE" && (
                      <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${TOUR_STATUS_CONFIG[t.status]?.className || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {TOUR_STATUS_CONFIG[t.status]?.label || t.status}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showOptionPicker && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Select value={optionId || "all"} onValueChange={(v) => setSelectedOption(v === "all" ? "" : v)}>
              <SelectTrigger className="flex-1 min-w-0 px-3 text-sm text-slate-700">
                <SelectValue placeholder="All options" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All options</SelectItem>
                {tourOptions.map((o, i) => (
                  <SelectItem key={o.id || i} value={o.id}>
                    {o.title || `Option ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0">
            {[
              { key: "month", label: "Month" },
              { key: "week", label: "Week" },
              { key: "all", label: "All" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setDateMode(m.key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  dateMode === m.key
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {dateMode === "month" && (
            <>
              <div className="flex items-center gap-0.5">
                <button onClick={() => goMonth("prev")} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><ChevronLeft size={15} /></button>
                <span className="text-sm font-semibold text-slate-800 w-24 text-center select-none">{format(currentDate, "MMMM yyyy")}</span>
                <button onClick={() => goMonth("next")} className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><ChevronRight size={15} /></button>
              </div>
              <button onClick={() => { const d = new Date(); setCurrentDate(d); syncUrl(selectedTour, d); }} className="text-xs font-medium text-[#044b3b] hover:text-[#033629] transition-colors px-1.5 py-1 rounded-md hover:bg-emerald-50">
                Today
              </button>
            </>
          )}

          {dateMode !== "month" && (
            <span className="text-xs text-slate-400 select-none">
              {dateMode === "week" ? format(new Date(), "MMM d") + " – " + format(addDays(new Date(), 6), "MMM d, yyyy") : format(subMonths(new Date(), 3), "MMM d") + " – " + format(addMonths(new Date(), 3), "MMM d, yyyy")}
            </span>
          )}

          {availLoading && <RefreshCw size={13} className="animate-spin text-slate-400 shrink-0" />}
          {availError && !availLoading && (
            <button onClick={() => refetchAvail()} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"><RefreshCw size={12} /> Retry</button>
          )}
        </div>
      </div>

      {/* ====== STATS ====== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {[
          { label: "Available", value: stats.available, icon: CheckCircle2, bg: "bg-emerald-50", border: "border-emerald-200/60", color: "text-emerald-600", bar: "from-emerald-400 to-emerald-300", },
          { label: "Limited", value: stats.limited, icon: AlertTriangle, bg: "bg-amber-50", border: "border-amber-200/60", color: "text-amber-600", bar: "from-amber-400 to-amber-300", },
          { label: "Full", value: stats.full, icon: XCircle, bg: "bg-red-50", border: "border-red-200/60", color: "text-red-600", bar: "from-red-400 to-red-300", },
          { label: "Blocked", value: stats.blocked, icon: Ban, bg: "bg-slate-50", border: "border-slate-200/60", color: "text-slate-500", bar: "from-slate-400 to-slate-300", },
          { label: "Past", value: stats.past, icon: CalendarX2, bg: "bg-slate-50", border: "border-slate-200/60", color: "text-slate-400", bar: "from-slate-300 to-slate-200", },
        ].map((s) => (
          <div key={s.label} className="relative bg-white rounded-xl border border-slate-200 p-3 sm:p-4 group hover:shadow-md hover:border-slate-300 transition-all overflow-hidden">
            <div className="flex items-start gap-2.5 sm:gap-3.5">
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${s.bg} ${s.border} border flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <s.icon size={16} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl sm:text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-slate-400 leading-tight mt-0.5">{s.label}</p>
              </div>
            </div>
            <div className={`absolute bottom-0 left-0 h-1 bg-linear-to-r ${s.bar} transition-all duration-500 ease-out rounded-full`}
              style={{ width: s.value > 0 ? `${Math.min((s.value / totalDays) * 100, 100)}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* ====== STATUS FILTER + LEGEND ====== */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-4 flex-wrap">
        {STATUS_ORDER.map((s) => {
          const c = STATUS_CONFIG[s];
          const active = statusFilter[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter((prev) => ({ ...prev, [s]: !prev[s] }))}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border text-[11px] sm:text-xs font-medium transition-all ${
                active
                  ? s === "available"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : s === "limited"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : s === "full"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : s === "past"
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                  : "border-transparent text-slate-300 hover:text-slate-400"
              }`}
            >
              <c.icon size={11} />
              {c.label}
            </button>
          );
        })}
        <span className="text-[11px] text-slate-300 mx-0.5 sm:mx-1 hidden sm:inline">|</span>
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#044b3b]" />
          <span className="text-[11px] text-slate-400">Override</span>
        </div>
      </div>

      {/* ====== CALENDAR ====== */}
      {calendar[0]?.capacityUnit === "groups" && (
        <p className="text-[11px] text-slate-400 mb-2 -mt-2">
          Showing group slots &mdash; a booking uses one group slot regardless of party size
        </p>
      )}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1.5 sm:py-2 text-center text-[9px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{d}</div>
          ))}
        </div>

        {availLoading && !calendar.length ? (
          <div className="py-20 flex items-center justify-center"><LoadingSpinner /></div>
        ) : visibleDays.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <CalendarIcon size={32} className="text-slate-300 mb-2" strokeWidth={1.5} />
            <p className="text-sm text-slate-400">No dates match the current filters</p>
            <button onClick={() => setStatusFilter({ available: true, limited: true, full: true, blocked: true, past: true })} className="mt-2 text-xs text-[#044b3b] hover:text-[#033629] underline">
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {Array.from({ length: padStart }).map((_, i) => <div key={`p-${i}`} className="bg-white" />)}

              {visibleDays.map((date) => {
              const day = getDay(date);
              const s = STATUS_CONFIG[day.status] || STATUS_CONFIG.available;
              const today = isToday(date);
              const usage = day.capacity > 0 ? (day.booked / day.capacity) * 100 : 0;
              const filteredOut = !statusFilter[day.status];
              const isBlocked = day.status === "blocked";
              const isPast = day.status === "past";

              return (
                <button
                  key={format(date, "yyyy-MM-dd")}
                  onClick={() => !filteredOut && !isPast && openPanel(date)}
                  disabled={filteredOut || isPast}
                   className={`relative flex flex-col items-center py-2 sm:py-3 px-0.5 sm:px-1 border-b border-r border-slate-100 transition-colors min-h-[60px] sm:min-h-[80px] ${
                    filteredOut
                      ? "opacity-20 cursor-default bg-white"
                      : isPast
                        ? "bg-slate-50 cursor-default"
                        : isBlocked
                          ? "bg-slate-50 hover:bg-slate-100 cursor-pointer"
                          : day.status === "full"
                            ? "bg-red-50 hover:bg-red-100 cursor-pointer"
                            : day.status === "limited"
                              ? "bg-amber-50 hover:bg-amber-100 cursor-pointer"
                              : "hover:bg-slate-50 active:bg-slate-100 cursor-pointer bg-white"
                  } ${today && !isBlocked && !isPast && day.status !== "full" && day.status !== "limited" ? "bg-emerald-50/40" : ""}`}
                >
                  <span className={`text-xs sm:text-sm font-semibold leading-none mb-1 sm:mb-1.5 ${today && !isBlocked && !isPast && day.status !== "full" && day.status !== "limited" ? "text-[#044b3b]" : isPast ? "text-slate-300" : isBlocked || day.status === "full" ? "text-slate-400" : day.status === "limited" ? "text-amber-600" : "text-slate-700"}`}>
                    {format(date, "d")}
                  </span>

                  {!isBlocked && !isPast && (
                    <span className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1">
                      {day.status === "available" && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400" />}
                      {day.status === "limited" && (
                        <>
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400" />
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-amber-400" />
                        </>
                      )}
                      {day.status === "full" && <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-red-400" />}
                    </span>
                  )}

                  {isBlocked ? (
                    <span className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider leading-none mt-0.5">Blocked</span>
                  ) : isPast ? (
                    <span className="text-[8px] sm:text-[9px] font-medium text-slate-300 uppercase tracking-wider leading-none mt-0.5">Past</span>
                  ) : day.status === "limited" ? (
                    <>
                      <span className="text-[8px] sm:text-[9px] font-medium text-amber-600 uppercase tracking-wider leading-none mt-0.5">Limited</span>
                      {day.capacity > 0 && (
                        <>
                          <div className="hidden sm:block w-8 h-1 rounded-full bg-amber-100 overflow-hidden mt-0.5 mb-1">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(usage, 100)}%` }} />
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-amber-700 leading-none">{day.booked}/{day.capacity}{day.capacityUnit === "groups" ? "g" : ""}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="hidden sm:block w-8 h-1 rounded-full bg-slate-100 overflow-hidden mb-1">
                        <div className={`h-full rounded-full transition-all ${s.bar}`} style={{ width: `${Math.min(usage, 100)}%` }} />
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 leading-none">{day.booked}/{day.capacity}{day.capacityUnit === "groups" ? "g" : ""}</span>
                    </>
                  )}

                  {day.hasOverride && <span className="absolute top-1.5 right-1.5 sm:right-2 w-1 h-1 rounded-full bg-[#044b3b]" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== SIDE PANEL ========== */}
      {panelOpen && selectedDate && selectedDay && (
        <>
          <div className={`fixed inset-0 bg-black/20 z-[70] transition-opacity duration-250 ${panelVisible ? "opacity-100" : "opacity-0"}`} onClick={closePanel} />
          <div className={`fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-[71] flex flex-col transition-all duration-250 ease-out ${panelVisible ? "translate-x-0" : "translate-x-full"}`}>

            {/* === ACCENT BAR at top based on the day's actual status === */}
            <div className={`h-1.5 shrink-0 transition-colors duration-300 ${selectedDay.status === "blocked" ? "bg-slate-400" : selectedDay.status === "limited" ? "bg-amber-400" : selectedDay.status === "full" ? "bg-red-400" : "bg-emerald-400"}`} />

            {/* === PANEL HEADER — big date === */}
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <button onClick={closePanel} className="bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 p-1.5 rounded-lg transition-colors shadow-sm">
                  <ChevronLeft size={16} />
                </button>
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${cfg ? cfg?.badge?.split(" ")[0] : "text-slate-400"}`}>
                  {cfg?.label || "Available"}
                </span>
              </div>

              <div className="flex items-end gap-3 mt-1">
                <span className="text-5xl font-extralight text-slate-900 leading-none tracking-tight">
                  {format(selectedDate, "d")}
                </span>
                <div className="pb-1">
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{format(selectedDate, "EEEE")}</p>
                  <p className="text-xs text-slate-400">{format(selectedDate, "MMMM yyyy")}</p>
                </div>
              </div>
            </div>

            {/* === PANEL BODY === */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

              {/* --- Automatic status --- */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Status</p>
                <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border ${cfg?.badge}`}>
                  <cfg.icon size={18} className="shrink-0" />
                  <div>
                    <p className="text-sm font-semibold leading-tight">{cfg?.label}</p>
                    <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Automatic · based on bookings vs capacity</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Available, Limited and Full are calculated automatically. Only Blocked can be set manually.
                </p>
              </div>

              {/* --- Day limit (per-date capacity override) --- */}
              {selectedDay.status !== "blocked" && selectedDay.status !== "past" && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-slate-400" />
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Day limit</p>
                    </div>
                    {selectedDay.overrideCapacity != null && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Override active</span>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1.5">
                        Maximum for {format(selectedDate, "EEEE, MMM d")} ·{" "}
                        {selectedDay.capacityUnit === "groups" ? "group slots" : "people"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          max={100000}
                          step={1}
                          value={capacityDraft}
                          onChange={(e) => setCapacityDraft(e.target.value)}
                          disabled={capacityMut.isPending}
                          className="w-full px-3 py-2 text-sm font-semibold text-slate-900 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                        />
                        <button
                          onClick={handleCapacityApply}
                          disabled={capacityMut.isPending || !capacityDirty}
                          className="shrink-0 px-3.5 py-2 text-xs font-semibold text-white bg-[#044b3b] rounded-lg hover:bg-[#033629] disabled:opacity-40 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {selectedDay.overrideCapacity != null
                          ? `Overrides the tour default of ${selectedDay.baseCapacity} for this day.`
                          : `The tour default is ${selectedDay.baseCapacity}. Set a tighter day-wide cap.`}{" "}
                        {selectedDay.capacityUnit === "groups"
                          ? "Counts group slots across all time slots."
                          : "Counts people across all time slots."}
                      </p>
                    </div>
                    {selectedDay.overrideCapacity != null && (
                      <button
                        onClick={handleCapacityClear}
                        disabled={capacityMut.isPending}
                        className="w-full text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
                      >
                        Remove day limit (back to {selectedDay.baseCapacity})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* --- Time Slots --- */}
              {selectedDay.status !== "blocked" && selectedDay.slots?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Clock size={12} className="text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Time Slots</p>
                  </div>
                  <div className="space-y-2">
                    {selectedDay.slots.map((slot, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3.5 py-2.5 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-slate-300" />
                          <span className="text-sm font-medium text-slate-700">{slot.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {selectedDay.capacityUnit === "groups" ? (
                            <>
                              <span className={`text-xs font-medium ${(slot.groupsBooked || 0) >= (selectedDay.groupsPerSlot || 0) ? "text-red-500" : "text-slate-500"}`}>
                                {slot.groupsBooked}/{selectedDay.groupsPerSlot}
                              </span>
                              <span className="text-[10px] text-slate-400">groups</span>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs font-medium ${slot.booked >= slot.capacity ? "text-red-500" : "text-slate-500"}`}>
                                {slot.booked}/{slot.capacity}
                              </span>
                              <span className="text-[10px] text-slate-400">booked</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* --- Cut-off times (per-slot overrides) --- */}
              {selectedDay.status !== "blocked" && selectedDay.slots?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cut-off times</p>
                    </div>
                    {slotCutoffsDirty && (
                      <button
                        onClick={handleSaveSlotCutoffs}
                        disabled={slotCutoffMut.isPending}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#044b3b] rounded-md hover:bg-[#033629] disabled:opacity-40 transition-colors"
                      >
                        {slotCutoffMut.isPending ? "Saving…" : "Save"}
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-3">
                    {selectedDay.slots.map((slot) => {
                      const value = slotCutoffDrafts[slot.time] ?? defaultCutoffDraft;
                      return (
                        <div key={slot.time} className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700">{slot.time}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatCutoffLabel(value)} &middot; bookings close at {cutoffInstant(slot.time, value)}
                            </p>
                          </div>
                          <div className="w-32 shrink-0">
                            <CutoffSelect value={value} onChange={(v) => handleSlotCutoffChange(slot.time, v)} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700">Default for this day</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Used by any slot without its own cut-off</p>
                      </div>
                      <div className="w-32 shrink-0">
                        <CutoffSelect value={defaultCutoffDraft} onChange={setDefaultCutoffDraft} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyDefaultToAllSlots}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
                    >
                      Apply default to all slots
                    </button>
                  </div>
                </div>
              )}

              {/* --- Summary card --- */}
              {selectedDay.status !== "blocked" && (
                <div className="bg-linear-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Users size={12} className="text-slate-400" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Booking Summary</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: selectedDay.capacityUnit === "groups" ? "Group slots" : "Capacity", value: selectedDay.capacity, color: "text-slate-900" },
                      { label: "Booked", value: selectedDay.booked, color: selectedDay.booked > 0 ? "text-amber-600" : "text-slate-500" },
                      { label: "Available", value: Math.max(0, selectedDay.capacity - selectedDay.booked), color: "text-emerald-600" },
                    ].map((item) => (
                      <div key={item.label} className="bg-white rounded-lg border border-slate-100 py-2.5 text-center">
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  {selectedDay.capacityUnit === "groups" && selectedDay.maxGroupSize && (
                    <p className="text-[11px] text-slate-400 mt-2">Group bookings &middot; up to {selectedDay.maxGroupSize} travelers per group</p>
                  )}
                </div>
              )}

              {/* --- Override indicator --- */}
              {selectedDay.hasOverride && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${selectedDay.status === "blocked" ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{selectedDay.status === "blocked" ? "This date is manually blocked" : "An override is active for this date"}</span>
                </div>
              )}
            </div>

            {/* === PANEL FOOTER === */}
            {confirmingBlock ? (
              <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/50">
                <div className="flex items-start gap-2.5 bg-red-50 rounded-xl p-3.5 border border-red-100">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Block this date?</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      While blocked, travelers won't be able to book this date. Only block if you're genuinely
                      unavailable that day. You can unblock anytime.
                    </p>
                    {selectedDay.booked > 0 && (
                      <p className="text-xs font-medium text-red-600 mt-1.5">
                        This date has {selectedDay.booked}{" "}
                        {selectedDay.capacityUnit === "groups" ? "group booking" + (selectedDay.booked === 1 ? "" : "s") : "booking" + (selectedDay.booked === 1 ? "" : "s")}{" "}
                        and can't be blocked.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingBlock(false)}
                    disabled={pending}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBlockConfirm}
                    disabled={pending || selectedDay.booked > 0}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {blockMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Ban size={14} />}
                    Confirm Block
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 px-5 py-4 space-y-2 bg-slate-50/50">
                <div className="flex gap-2">
                  {selectedDay.hasOverride && selectedDay.status !== "blocked" && (
                    <button
                      onClick={handleRevert}
                      disabled={pending}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Undo2 size={13} /> Revert
                    </button>
                  )}
                  <button
                    onClick={handleBlockAction}
                    disabled={pending}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50 ${
                      selectedDay.status === "blocked"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    }`}
                  >
                    <Ban size={13} />
                    {selectedDay.status === "blocked" ? "Unblock Date" : "Block Date"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

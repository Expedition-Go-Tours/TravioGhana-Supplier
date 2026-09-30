import { useId, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, Ban, CalendarX2, CheckCircle2, ChevronLeft, Clock, Undo2, Users, Wallet, XCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import StaysButton from "./StaysButton";
import { formatMoney } from "../utils/money";

/**
 * The availability editor — a right slide-over panel matching the Experiences
 * availability panel: status accent bar, back chevron + status label, big
 * date, then sectioned fields and a Revert/Block footer.
 *
 * Built on Radix Dialog so the slide-over keeps a focus trap, Escape handling
 * and `aria-modal` semantics. Mounted fresh per open (the page supplies a
 * `key`), so drafts reset when a different cell is opened.
 */

const STATUS_CONFIG = {
  Available: { label: "Available", icon: CheckCircle2, badge: "text-emerald-700 bg-emerald-50 border-emerald-200", accent: "bg-emerald-400" },
  Limited: { label: "Limited", icon: AlertTriangle, badge: "text-amber-700 bg-amber-50 border-amber-200", accent: "bg-amber-400" },
  Full: { label: "Full", icon: XCircle, badge: "text-red-700 bg-red-50 border-red-200", accent: "bg-red-400" },
  Blocked: { label: "Blocked", icon: Ban, badge: "text-slate-600 bg-slate-50 border-slate-200", accent: "bg-slate-400" },
  Past: { label: "Past", icon: CalendarX2, badge: "text-slate-500 bg-slate-50 border-slate-200", accent: "bg-slate-200" },
};

function Section({ icon: Icon, title, action, children }) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon size={12} className="text-slate-400" />}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** One input + dark-green Apply row, matching the Experiences "Day limit". */
function ApplyRow({ label, value, onChange, onApply, dirty, pending, divider }) {
  const inputId = useId();
  return (
    <div className={cn("space-y-1.5", divider && "border-t border-slate-200 pt-3")}>
      <label htmlFor={inputId} className="block text-xs text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={pending}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={onApply}
          disabled={pending || !dirty}
          className="shrink-0 rounded-lg bg-[#044b3b] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#033629] disabled:opacity-40"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function AvailabilityCellPanel({
  open,
  room,
  date,
  override,
  todayIso,
  pending = false,
  onClose,
  onApply,
  onClear,
}) {
  const effective = useMemo(
    () => ({
      price: override?.price ?? room?.price ?? 0,
      count: override?.count ?? room?.count ?? 0,
      minStay: override?.minStay || 1,
      closed: Boolean(override?.closed),
    }),
    [override, room],
  );

  const [priceDraft, setPriceDraft] = useState(() => String(effective.price));
  const [countDraft, setCountDraft] = useState(() => String(effective.count));
  const [minStayDraft, setMinStayDraft] = useState(() => String(effective.minStay));
  const [confirmingBlock, setConfirmingBlock] = useState(false);

  if (!open || !room || !date) return null;

  const status =
    date < todayIso
      ? "Past"
      : effective.closed
        ? "Blocked"
        : effective.count <= 0
          ? "Full"
          : effective.count <= 1
            ? "Limited"
            : "Available";
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  const merged = (patch) => ({ ...effective, ...patch });
  const number = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
  };

  const priceDirty = number(priceDraft, effective.price) !== effective.price;
  const countDirty = number(countDraft, effective.count) !== effective.count;
  const minStayDirty = Math.max(1, number(minStayDraft, effective.minStay)) !== effective.minStay;
  const hasOverride = Boolean(override);

  const applyPrice = () =>
    onApply(merged({ price: number(priceDraft, effective.price) }), "Nightly price updated");
  const applyCount = () =>
    onApply(merged({ count: number(countDraft, effective.count) }), "Rooms available updated");
  const applyMinStay = () =>
    onApply(merged({ minStay: Math.max(1, number(minStayDraft, effective.minStay)) }), "Minimum stay updated");

  const blockDate = () => {
    onApply(merged({ closed: true }), "Date blocked");
    setConfirmingBlock(false);
    onClose();
  };
  const unblockDate = () => {
    onApply(merged({ closed: false }), "Date unblocked");
    onClose();
  };

  const parsed = parseISO(date);

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/20 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-sm flex-col bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right">
          {/* Status accent bar */}
          <div className={cn("h-1.5 shrink-0", cfg.accent)} />

          {/* Header — big date + room context */}
          <div className="border-b border-slate-100 px-5 pb-4 pt-5">
            <div className="mb-1 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition-colors hover:border-emerald-400"
                aria-label="Back to calendar"
              >
                <ChevronLeft size={16} />
              </button>
              <span className={cn("text-[10px] font-semibold uppercase tracking-widest", cfg.badge.split(" ")[0])}>
                {cfg.label}
              </span>
            </div>

            <Dialog.Title asChild>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-5xl font-extralight leading-none tracking-tight text-slate-900">
                  {format(parsed, "d")}
                </span>
                <div className="pb-1">
                  <p className="text-sm font-semibold leading-tight text-slate-700">{format(parsed, "EEEE")}</p>
                  <p className="text-xs text-slate-400">{format(parsed, "MMMM yyyy")}</p>
                </div>
              </div>
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-xs text-slate-500">
              {room.name} · {room.kind} · {room.count} {room.count === 1 ? "unit" : "units"}
            </Dialog.Description>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            {/* Status */}
            <Section title="Status">
              <div className={cn("flex items-center gap-2.5 rounded-xl border px-4 py-3", cfg.badge)}>
                <StatusIcon size={18} className="shrink-0" />
                <div>
                  <p className="text-sm font-semibold leading-tight">{cfg.label}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-slate-400">
                    {status === "Blocked" ? "Manually blocked for this night" : "Automatic · based on rooms left"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Available, Limited and Full are calculated from the rooms you leave open. Only Blocked is set
                manually.
              </p>
            </Section>

            {/* Inventory */}
            {status !== "Past" && (
              <Section icon={Wallet} title="Inventory">
                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <ApplyRow
                    label={`Nightly price (GHS) for ${format(parsed, "EEE, MMM d")}`}
                    value={priceDraft}
                    onChange={setPriceDraft}
                    onApply={applyPrice}
                    dirty={priceDirty}
                    pending={pending}
                  />
                  <ApplyRow
                    label="Rooms available"
                    value={countDraft}
                    onChange={setCountDraft}
                    onApply={applyCount}
                    dirty={countDirty}
                    pending={pending}
                    divider
                  />
                  <ApplyRow
                    label="Minimum stay (nights)"
                    value={minStayDraft}
                    onChange={setMinStayDraft}
                    onApply={applyMinStay}
                    dirty={minStayDirty}
                    pending={pending}
                    divider
                  />
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    {hasOverride
                      ? `Overrides the room defaults (${formatMoney(room.price)} · ${room.count} rooms · ${room.minStay || 1} night minimum) for this date.`
                      : `The room defaults are ${formatMoney(room.price)}, ${room.count} rooms and a ${room.minStay || 1}-night minimum.`}
                  </p>
                </div>
              </Section>
            )}

            {/* Summary */}
            {status !== "Past" && (
              <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                <div className="mb-3 flex items-center gap-1.5">
                  <Users size={12} className="text-slate-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Listing summary
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Price", value: formatMoney(effective.price), color: "text-slate-900" },
                    { label: "Rooms", value: effective.closed ? "—" : effective.count, color: "text-slate-900" },
                    {
                      label: "Min stay",
                      value: `${effective.minStay}n`,
                      color: "text-slate-500",
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-100 bg-white py-2.5 text-center">
                      <p className={cn("text-lg font-bold", item.color)}>{item.value}</p>
                      <p className="text-[9px] uppercase tracking-wider text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Override indicator */}
            {hasOverride && (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                  status === "Blocked"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-amber-200 bg-amber-50 text-amber-700",
                )}
              >
                <AlertTriangle size={12} className="shrink-0" />
                <span>
                  {status === "Blocked"
                    ? "This room is manually blocked on this date"
                    : "An override is active for this date"}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          {confirmingBlock ? (
            <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Block this date?</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    While blocked, guests won't be able to book {room.name} for this night. You can unblock
                    anytime.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <StaysButton className="flex-1" onClick={() => setConfirmingBlock(false)} disabled={pending}>
                  Cancel
                </StaysButton>
                <button
                  type="button"
                  onClick={blockDate}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  <Ban size={14} />
                  Confirm block
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="flex gap-2">
                {hasOverride && status !== "Blocked" && (
                  <StaysButton
                    className="flex-1"
                    onClick={() => {
                      onClear();
                      onClose();
                    }}
                    disabled={pending}
                  >
                    <Undo2 size={13} /> Reset
                  </StaysButton>
                )}
                {status === "Past" ? (
                  <span className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-400">
                    <Clock size={13} /> Past dates can't be edited
                  </span>
                ) : status === "Blocked" ? (
                  <button
                    type="button"
                    onClick={unblockDate}
                    disabled={pending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Ban size={13} /> Unblock date
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingBlock(true)}
                    disabled={pending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  >
                    <Ban size={13} /> Block date
                  </button>
                )}
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

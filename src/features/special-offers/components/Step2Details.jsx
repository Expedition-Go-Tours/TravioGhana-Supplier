import { motion, AnimatePresence } from "framer-motion";
import { Clock, Sunrise, Timer, CalendarDays, Percent, DollarSign, Copy, Layers, Users } from "lucide-react";
import { useSpecialOfferBuilderStore } from "@/features/special-offers/stores/specialOfferBuilderStore";
import DatePicker from "@/components/forms/DatePicker";
import { cn } from "@/lib/utils";

const OFFER_TYPES = [
  { value: "LIMITED_TIME", label: "Limited Time", desc: "Standard discount for a specific period", icon: Clock },
  { value: "EARLY_BIRD", label: "Early Bird", desc: "For bookings made in advance", icon: Sunrise },
  { value: "LAST_MINUTE", label: "Last Minute", desc: "For bookings close to travel date", icon: Timer },
];

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function Step2Details() {
  const { offer, updateOffer, errors } = useSpecialOfferBuilderStore();

  const toggleWeekday = (day) => {
    const current = offer.specificWeekdays || [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    updateOffer({ specificWeekdays: next });
  };

  return (
    <div className="space-y-8">
      {/* Offer Name */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Offer Name</label>
        <div className="relative">
          <input
            type="text"
            placeholder='e.g. "Summer Sale 2026"'
            value={offer.name}
            onChange={(e) => updateOffer({ name: e.target.value })}
            className={cn(
              "w-full px-4 py-3 border rounded-xl text-sm transition-all",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300",
              errors.name ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
            )}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">
            {offer.name.length}/60
          </span>
        </div>
        {errors.name && <p className="mt-1.5 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Offer Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">Offer Type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {OFFER_TYPES.map((type) => {
            const Icon = type.icon;
            const selected = offer.offerType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => updateOffer({ offerType: type.value })}
                className={cn(
                  "relative text-left p-4 rounded-xl border-2 transition-all",
                  selected
                    ? "border-emerald-500 bg-emerald-50/80 ring-1 ring-emerald-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                {selected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <Icon size={22} className={cn("mb-2.5", selected ? "text-emerald-600" : "text-slate-400")} />
                <p className={cn("text-sm font-semibold", selected ? "text-emerald-800" : "text-slate-800")}>
                  {type.label}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{type.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range — only for LIMITED_TIME */}
      {offer.offerType === "LIMITED_TIME" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-emerald-600" />
            <label className="text-sm font-semibold text-slate-700">Offer Period</label>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Start Date</label>
                <DatePicker
                  selected={offer.startDate}
                  onChange={(date) => updateOffer({ startDate: date })}
                  placeholderText="Select start date"
                  minDate={new Date()}
                  className="w-full"
                />
                {errors.startDate && <p className="mt-1 text-sm text-red-500">{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">End Date</label>
                <DatePicker
                  selected={offer.endDate}
                  onChange={(date) => updateOffer({ endDate: date })}
                  placeholderText="Select end date"
                  minDate={offer.startDate || new Date()}
                  className="w-full"
                />
                {errors.endDate && <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range — required for LIMITED_TIME, optional availability
          window for EARLY_BIRD / LAST_MINUTE (open-ended when empty) */}
      {offer.offerType !== "LIMITED_TIME" && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} className="text-emerald-600" />
            <label className="text-sm font-semibold text-slate-700">Availability Window</label>
            <span className="text-xs text-slate-400 font-medium">(optional)</span>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-4">
              Leave empty to keep this offer available indefinitely. Set dates to limit when the offer can be redeemed.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">Start Date</label>
                <DatePicker
                  selected={offer.startDate}
                  onChange={(date) => updateOffer({ startDate: date })}
                  placeholderText="Optional"
                  minDate={new Date()}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">End Date</label>
                <DatePicker
                  selected={offer.endDate}
                  onChange={(date) => updateOffer({ endDate: date })}
                  placeholderText="Optional"
                  minDate={offer.startDate || new Date()}
                  className="w-full"
                />
              </div>
            </div>
            {offer.startDate && offer.endDate && new Date(offer.startDate) >= new Date(offer.endDate) && (
              <p className="mt-2 text-sm text-red-500">End date must be after start date</p>
            )}
          </div>
        </div>
      )}
      {/* Discount Type */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-3">Discount Type</label>
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => updateOffer({ discountType: "PERCENTAGE" })}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              offer.discountType === "PERCENTAGE"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Percent size={16} />
            Percentage
          </button>
          <button
            type="button"
            onClick={() => updateOffer({ discountType: "FIXED_AMOUNT" })}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              offer.discountType === "FIXED_AMOUNT"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <DollarSign size={16} />
            Fixed Amount
          </button>
        </div>
      </div>

      {/* Dynamic Thresholds */}
      <AnimatePresence>
        {offer.offerType === "EARLY_BIRD" && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sunrise size={16} className="text-amber-500" />
                <label className="text-sm font-semibold text-slate-700">Early Bird Threshold</label>
              </div>
              <p className="text-xs text-slate-500 mb-3">Minimum days before travel that the booking must be made.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={offer.earlyBirdAdvanceDays ?? 7}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateOffer({ earlyBirdAdvanceDays: isNaN(val) ? null : val });
                  }}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
                />
                <span className="text-sm text-slate-600 font-medium">days in advance</span>
              </div>
            </div>
          </motion.div>
        )}

        {offer.offerType === "LAST_MINUTE" && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer size={16} className="text-orange-500" />
                <label className="text-sm font-semibold text-slate-700">Last Minute Window</label>
              </div>
              <p className="text-xs text-slate-500 mb-3">Hours before travel when this offer becomes active.</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={offer.lastMinuteWindowHours ?? 72}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updateOffer({ lastMinuteWindowHours: isNaN(val) ? null : val });
                  }}
                  className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
                />
                <span className="text-sm text-slate-600 font-medium">hours before departure</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promo Code */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <Copy size={16} className="text-emerald-600" />
          <label className="text-sm font-semibold text-slate-700">Promo Code</label>
          <span className="text-xs text-slate-400 font-medium">(optional)</span>
        </div>
        <p className="text-xs text-slate-500 mb-3">If set, customers must enter this code to redeem the offer.</p>
        <input
          type="text"
          placeholder="e.g. SUMMER20"
          value={offer.promoCode}
          onChange={(e) => updateOffer({ promoCode: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })}
          className={cn(
            "w-full max-w-xs px-4 py-3 border rounded-xl text-sm font-mono tracking-wider uppercase transition-all",
            "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300",
            "border-slate-200 bg-white"
          )}
        />
      </div>

      {/* Minimum Requirements */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-emerald-600" />
          <label className="text-sm font-semibold text-slate-700">Minimum Requirements</label>
          <span className="text-xs text-slate-400 font-medium">(optional)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Min. Quantity (bookings)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={offer.minQuantity ?? ""}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateOffer({ minQuantity: isNaN(val) ? null : val });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Min. Spend Amount ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50.00"
              value={offer.minSpendAmount ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateOffer({ minSpendAmount: isNaN(val) ? null : val });
              }}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
            />
          </div>
        </div>
      </div>

      {/* Max Redemptions Per Customer + Stackable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-emerald-600" />
            <label className="text-sm font-semibold text-slate-700">Max Per Customer</label>
            <span className="text-xs text-slate-400 font-medium">(optional)</span>
          </div>
          <input
            type="number"
            min="1"
            placeholder="e.g. 1"
            value={offer.maxRedemptionsPerCustomer ?? ""}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              updateOffer({ maxRedemptionsPerCustomer: isNaN(val) ? null : val });
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
          />
          <p className="text-xs text-slate-400 mt-1.5">How many times one customer can redeem.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="text-sm font-semibold text-slate-700 mb-3 block">Stackable</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateOffer({ stackable: !offer.stackable })}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                offer.stackable ? "bg-emerald-600" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                offer.stackable ? "translate-x-6" : "translate-x-0.5"
              )} />
            </button>
            <span className="text-sm text-slate-600">
              {offer.stackable ? "Can combine with other offers" : "Cannot be combined"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {offer.stackable
              ? "This offer works alongside other stackable offers on the same booking. The pricing engine will apply all eligible stackable offers together."
              : "Only one non-stackable offer per booking. If another non-stackable offer is already applied, this one is skipped — and if this one applies first, others are ignored."}
          </p>
        </div>
      </div>

      {/* Valid Days */}
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valid Days</label>
        <p className="text-xs text-slate-500 mb-4">Choose specific days or apply to all days of the week</p>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit mb-4">
          <button
            type="button"
            onClick={() => updateOffer({ timeSlotMode: "ALL_DAYS", specificWeekdays: [] })}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              offer.timeSlotMode === "ALL_DAYS"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            All Days
          </button>
          <button
            type="button"
            onClick={() => updateOffer({ timeSlotMode: "SPECIFIC_WEEKDAYS" })}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              offer.timeSlotMode === "SPECIFIC_WEEKDAYS"
                ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Specific Days
          </button>
        </div>

        <AnimatePresence>
          {offer.timeSlotMode === "SPECIFIC_WEEKDAYS" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2.5">
                {WEEKDAYS.map((day) => {
                  const active = (offer.specificWeekdays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className={cn(
                        "px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-all border",
                        active
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50/50"
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {offer.timeSlotMode === "ALL_DAYS" && (
          <p className="text-xs text-slate-400">Offer applies every day of the week</p>
        )}
      </div>
    </div>
  );
}

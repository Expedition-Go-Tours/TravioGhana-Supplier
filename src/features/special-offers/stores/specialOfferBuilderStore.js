import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Package, CalendarRange, Percent } from "lucide-react";

export const STEPS = [
  { id: "products", label: "Products", number: 1, icon: Package, description: "Select the products and options this offer applies to." },
  { id: "details", label: "Offer Details", number: 2, icon: CalendarRange, description: "Set the offer period, type, and availability window." },
  { id: "discount", label: "Discount", number: 3, icon: Percent, description: "Set the discount percentage and capacity limits." },
];

const INITIAL_OFFER = {
  name: "",
  offerType: "LIMITED_TIME",
  discountType: "PERCENTAGE",
  discountPercentage: 10,
  fixedDiscountValue: null,
  startDate: null,
  endDate: null,
  isActive: true,
  capacityType: "UNLIMITED",
  maxSpots: null,
  timeSlotMode: "ALL_DAYS",
  specificWeekdays: [],
  targets: [],
  earlyBirdAdvanceDays: 7,
  lastMinuteWindowHours: 72,
  promoCode: "",
  minQuantity: null,
  minSpendAmount: null,
  maxRedemptionsPerCustomer: null,
  stackable: false,
};

export const useSpecialOfferBuilderStore = create(
  persist(
    (set, get) => ({
      steps: STEPS,
      currentStep: 0,
      offer: { ...INITIAL_OFFER },
      editingId: null,
      completedSteps: [],
      isDirty: false,
      isSaving: false,
      errors: {},
      hasHydrated: false,

      setHasHydrated: (val) => set({ hasHydrated: val }),
      setStep: (step) => set({ currentStep: step }),
      nextStep: () => {
        const { currentStep, completedSteps } = get();
        const newCompleted = [...new Set([...completedSteps, currentStep])];
        set({ currentStep: Math.min(currentStep + 1, STEPS.length - 1), completedSteps: newCompleted });
      },
      prevStep: () => set({ currentStep: Math.max(get().currentStep - 1, 0) }),
      goToStep: (step) => set({ currentStep: step }),

      updateOffer: (updates) => {
        const state = get();
        const merged = { ...state.offer, ...updates };
        if (updates.offerType === "EARLY_BIRD" && state.offer.offerType !== "EARLY_BIRD") {
          merged.earlyBirdAdvanceDays = merged.earlyBirdAdvanceDays || 7;
        }
        if (updates.offerType === "LAST_MINUTE" && state.offer.offerType !== "LAST_MINUTE") {
          merged.lastMinuteWindowHours = merged.lastMinuteWindowHours || 72;
        }
        if (updates.discountType === "PERCENTAGE" && state.offer.discountType !== "PERCENTAGE") {
          merged.fixedDiscountValue = null;
        }
        if (updates.discountType === "FIXED_AMOUNT" && state.offer.discountType !== "FIXED_AMOUNT") {
          merged.discountPercentage = 0;
        }
        set({ offer: merged, isDirty: true });
      },

      addTarget: (target) => set((state) => {
        const exists = state.offer.targets.some((t) => t.tourId === target.tourId && t.tourOptionKey === (target.tourOptionKey || null));
        if (exists) return state;
        return { offer: { ...state.offer, targets: [...state.offer.targets, target] }, isDirty: true };
      }),
      removeTarget: (index) => set((state) => {
        const targets = state.offer.targets.filter((_, i) => i !== index);
        return { offer: { ...state.offer, targets }, isDirty: true };
      }),
      // Change the scope of a selected product: whole product (key null) or a
      // single option. Replaces every other target row for that product so a
      // product can never be simultaneously "all options" and "this option".
      setTargetOption: (tourId, tourOptionKey, tourOptionLabel) => set((state) => {
        const existing = state.offer.targets.find((t) => t.tourId === tourId);
        const rest = state.offer.targets.filter((t) => t.tourId !== tourId);
        const row = {
          tourId,
          tourTitle: existing?.tourTitle || "",
          tourPhotos: existing?.tourPhotos || [],
          tourOptionKey: tourOptionKey || null,
          tourOptionLabel: tourOptionLabel || null,
        };
        return { offer: { ...state.offer, targets: [...rest, row] }, isDirty: true };
      }),

      setSaving: (val) => set({ isSaving: val }),
      markSaved: () => set({ isDirty: false }),
      setErrors: (errors) => set({ errors }),
      clearErrors: () => set({ errors: {} }),

      validateStep: (stepIndex) => {
        const { offer } = get();
        const errors = {};
        if (stepIndex === 0) {
          if (offer.targets.length === 0) errors.targets = "Select at least one product";
        }
        if (stepIndex === 1) {
          if (!offer.name || !offer.name.trim()) errors.name = "Offer name is required";
          if (offer.offerType === "LIMITED_TIME") {
            if (!offer.startDate) errors.startDate = "Start date is required";
            if (!offer.endDate) errors.endDate = "End date is required";
            if (offer.startDate && offer.endDate && new Date(offer.startDate) >= new Date(offer.endDate)) {
              errors.endDate = "End date must be after start date";
            }
          } else if (offer.startDate && offer.endDate && new Date(offer.startDate) >= new Date(offer.endDate)) {
            errors.endDate = "End date must be after start date";
          }
        }
        if (stepIndex === 2) {
          if (offer.discountType === "PERCENTAGE") {
            if (!offer.discountPercentage || offer.discountPercentage < 1 || offer.discountPercentage > 100) {
              errors.discountPercentage = "Discount must be between 1 and 100";
            }
          } else {
            if (!offer.fixedDiscountValue || offer.fixedDiscountValue <= 0) {
              errors.fixedDiscountValue = "Discount value must be greater than 0";
            }
          }
          if (offer.capacityType === "CAPPED" && (!offer.maxSpots || offer.maxSpots < 1)) {
            errors.maxSpots = "Max spots is required for capped offers";
          }
        }
        set({ errors });
        return Object.keys(errors).length === 0;
      },

      reset: () => set({
        currentStep: 0,
        offer: { ...INITIAL_OFFER },
        editingId: null,
        completedSteps: [],
        isDirty: false,
        isSaving: false,
        errors: {},
      }),

      loadOffer: (offer) => set({
        offer: {
          name: offer.name || "",
          offerType: offer.offerType || "LIMITED_TIME",
          discountType: offer.discountType || "PERCENTAGE",
          discountPercentage: offer.discountPercentage || 10,
          fixedDiscountValue: offer.fixedDiscountValue || null,
          startDate: offer.startDate ? new Date(offer.startDate) : null,
          endDate: offer.endDate ? new Date(offer.endDate) : null,
          isActive: offer.isActive !== false,
          capacityType: offer.capacityType || "UNLIMITED",
          maxSpots: offer.maxSpots || null,
          timeSlotMode: offer.timeSlotMode || "ALL_DAYS",
          specificWeekdays: offer.specificWeekdays || [],
          targets: (offer.targets || []).map((t) => ({
            tourId: t.tour?.id || t.tourId,
            tourTitle: t.tour?.title || "",
            tourPhotos: t.tour?.photos || t.tour?.coverPhoto ? [t.tour.coverPhoto] : [],
            tourOptionKey: t.tourOptionKey || null,
            tourOptionLabel: t.tourOptionLabel || null,
          })),
          earlyBirdAdvanceDays: offer.earlyBirdAdvanceDays || 7,
          lastMinuteWindowHours: offer.lastMinuteWindowHours || 72,
          promoCode: offer.promoCode || "",
          minQuantity: offer.minQuantity || null,
          minSpendAmount: offer.minSpendAmount || null,
          maxRedemptionsPerCustomer: offer.maxRedemptionsPerCustomer || null,
          stackable: offer.stackable || false,
        },
        editingId: offer.id,
        currentStep: 0,
        completedSteps: [],
        isDirty: false,
        errors: {},
      }),
    }),
    {
      name: "special-offer-builder-draft",
      partialize: (state) => ({
        offer: state.offer,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) state.setHasHydrated(true);
      },
    }
  )
);

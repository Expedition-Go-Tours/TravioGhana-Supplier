import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Home, NotebookText, Percent, Users } from "lucide-react";
import StaysSurface from "../components/StaysSurface";
import StaysPageHeader from "../components/StaysPageHeader";
import StaysCard from "../components/StaysCard";
import StaysButton from "../components/StaysButton";
import StaysPill from "../components/StaysPill";
import StaysStatCard from "../components/StaysStatCard";
import StaysSeg from "../components/StaysSeg";
import StaysEmptyState from "../components/StaysEmptyState";
import PolicyEditorModal from "../components/PolicyEditorModal";
import StaysPropertySelect from "../components/StaysPropertySelect";
import { usePropertyContext } from "../hooks/usePropertyContext";
import { POLICY_SECTIONS, policyLines, policyNote, policyValue } from "../config/policies";
import { updateProperty } from "../api";
import { formatMoney } from "../utils/money";

/**
 * Property policies — the prototype's six-section page: an overview of the
 * four rule panels, per-section detail views, the rate-level cancellation
 * table and the charges card. Editing happens in the section editor modal.
 */

/** One label/value line inside a panel. */
function PolicyLine({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-3 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-700">{value}</span>
    </div>
  );
}

/** Panel heading with its icon tile and an Edit action. */
function PanelHead({ icon: Icon, title, action }) {
  return (
    <div className="mb-1 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg border border-emerald-200/60 bg-emerald-50 text-emerald-600">
          <Icon size={15} />
        </span>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export default function StaysPoliciesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { property, properties, isLoading, selectProperty } = usePropertyContext();
  const [tab, setTab] = useState("Overview");
  const [editorSection, setEditorSection] = useState(null); // { section, openKey }

  const saveMutation = useMutation({
    mutationFn: (patch) => updateProperty(property.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stays", "properties"] });
      queryClient.invalidateQueries({ queryKey: ["stays", "property", property.id] });
    },
  });

  if (isLoading) {
    return (
      <StaysSurface>
        <StaysCard className="min-h-[300px] animate-pulse bg-white/60" />
      </StaysSurface>
    );
  }

  if (!property) {
    return (
      <StaysSurface>
        <StaysPageHeader title="Property policies" subtitle="Set clear expectations for guests." />
        <StaysCard>
          <StaysEmptyState title="No property yet">
            Use the property builder to add a listing, then set its policies.
          </StaysEmptyState>
        </StaysCard>
      </StaysSurface>
    );
  }

  const plans = property.ratePlans || [];
  const houseRulesConfigured = [property.pets, property.smoking, property.parties].filter(Boolean).length;
  const lines = policyLines(tab, property, plans);
  const note = policyNote(tab, property);
  const openEditor = (section) => setEditorSection({ section, openKey: Date.now() });

  const detailDescription = {
    "Arrival & departure": "Tell guests when they may arrive, leave and request exceptions.",
    "House rules": "Set day-to-day expectations for a comfortable stay.",
    "Families & extras": "Explain which guests can stay and what can be requested.",
    "Safety & access": "Give travellers practical information before arrival.",
    "Cancellation & charges": "Rate-level terms and optional charges.",
  };

  return (
    <StaysSurface>
      <StaysPageHeader
        title="Property policies"
        subtitle={`Set clear expectations for guests at ${property.name}.`}
        actions={
          <StaysButton size="small" onClick={() => navigate(`/stays/properties/build/${property.id}?step=6`)}>
            Edit in listing builder
          </StaysButton>
        }
      />

      {/* Property context */}
      <StaysCard className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[220px]">
          <StaysPropertySelect
            properties={properties}
            value={property.id}
            onChange={selectProperty}
            className="min-w-[240px] py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <StaysPill>{property.status}</StaysPill>
          <small className="text-xs text-slate-500">Guest-facing rules · saved with the listing</small>
        </div>
      </StaysCard>

      {/* Intro */}
      <div className="mb-4 flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-emerald-900">Make every stay easy to understand.</h2>
          <p className="mt-1 max-w-[680px] text-sm leading-relaxed text-emerald-800/80">
            Guests can see arrival times, house rules and the cancellation terms of the rate they choose. Keep
            these details accurate before accepting bookings.
          </p>
        </div>
        <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg border border-emerald-200/60 bg-white text-emerald-600 sm:grid">
          <NotebookText size={20} />
        </div>
      </div>

      <StaysSeg
        className="mb-4"
        ariaLabel="Policy sections"
        variant="tabs"
        options={POLICY_SECTIONS.map((section) => ({ value: section, label: section }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "Overview" ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StaysStatCard compact label="Check-in" value={property.checkin || "—"} hint="from" />
            <StaysStatCard compact label="Checkout" value={property.checkout || "—"} hint="by" />
            <StaysStatCard compact label="Rate plans" value={plans.length} hint="with own cancellation terms" />
            <StaysStatCard compact label="House rules" value={houseRulesConfigured} hint="configured" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Arrival & departure */}
            <StaysCard>
              <PanelHead
                icon={Clock}
                title="Arrival & departure"
                action={<StaysButton size="small" onClick={() => openEditor("Arrival & departure")}>Edit</StaysButton>}
              />
              <PolicyLine
                label="Check-in"
                value={`From ${property.checkin || "not set"}${property.checkinEnd ? ` · until ${property.checkinEnd}` : ""}`}
              />
              <PolicyLine label="Checkout" value={`By ${property.checkout || "not set"}`} />
              <PolicyLine
                label="Minimum check-in age"
                value={property.minAge ? `${property.minAge} years` : "Not set"}
              />
              <button
                type="button"
                onClick={() => setTab("Arrival & departure")}
                className="pt-3 text-left text-xs font-semibold text-emerald-600 hover:underline"
              >
                See arrival details →
              </button>
            </StaysCard>

            {/* House rules */}
            <StaysCard>
              <PanelHead
                icon={Home}
                title="House rules"
                action={<StaysButton size="small" onClick={() => openEditor("House rules")}>Edit</StaysButton>}
              />
              <PolicyLine label="Pets" value={policyValue(property, "pets", "Not allowed")} />
              <PolicyLine label="Smoking" value={policyValue(property, "smoking", "No smoking")} />
              <PolicyLine label="Parties" value={policyValue(property, "parties", "Not allowed")} />
              <button
                type="button"
                onClick={() => setTab("House rules")}
                className="pt-3 text-left text-xs font-semibold text-emerald-600 hover:underline"
              >
                See all house rules →
              </button>
            </StaysCard>

            {/* Families & extras */}
            <StaysCard>
              <PanelHead
                icon={Users}
                title="Families & extras"
                action={<StaysButton size="small" onClick={() => openEditor("Families & extras")}>Edit</StaysButton>}
              />
              <PolicyLine label="Children" value={policyValue(property, "children", "Welcome")} />
              <PolicyLine label="Extra beds" value={policyValue(property, "extraBeds", "Not available")} />
              <PolicyLine label="Cots" value={policyValue(property, "cots", "Not available")} />
              <button
                type="button"
                onClick={() => setTab("Families & extras")}
                className="pt-3 text-left text-xs font-semibold text-emerald-600 hover:underline"
              >
                See family policies →
              </button>
            </StaysCard>

            {/* Cancellation & charges */}
            <StaysCard>
              <PanelHead
                icon={Percent}
                title="Cancellation & charges"
                action={<StaysButton size="small" onClick={() => navigate("/stays/rates")}>View rate plans</StaysButton>}
              />
              <p className="my-3 text-sm leading-relaxed text-slate-500">
                Each bookable rate plan carries its own cancellation cutoff, late cancellation charge and no-show
                rule.
              </p>
              <div className="rounded-lg bg-slate-50 px-3.5 py-1.5">
                {plans.slice(0, 2).map((plan) => (
                  <div key={plan.id} className="flex justify-between gap-2.5 py-1.5 text-xs">
                    <b className="font-medium text-slate-700">{plan.name}</b>
                    <span className="text-slate-500">{plan.cancellation || "Free cancellation"}</span>
                  </div>
                ))}
                {plans.length === 0 && <small className="text-slate-400">Add a rate plan to set cancellation terms.</small>}
              </div>
              <button
                type="button"
                onClick={() => setTab("Cancellation & charges")}
                className="pt-3 text-left text-xs font-semibold text-emerald-600 hover:underline"
              >
                See all rate terms →
              </button>
            </StaysCard>
          </div>
        </>
      ) : (
        <>
          {/* Detail view */}
          <StaysCard className="max-w-[1000px]">
            <div className="mb-1 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row">
              <div className="min-w-0">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {property.name}
                </span>
                <h2 className="m-0 text-sm font-semibold text-slate-800">{tab}</h2>
                <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-500">{detailDescription[tab] || ""}</p>
              </div>
              <StaysButton variant="primary" size="small" onClick={() => openEditor(tab)}>
                Edit details
              </StaysButton>
            </div>

            {tab === "Cancellation & charges" ? (
              <div className="mt-4 overflow-auto">
                <div className="grid min-w-[760px] grid-cols-[1.3fr_1.4fr_1fr_1fr_1fr] gap-3 border-b border-slate-100 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <span>Room & plan</span>
                  <span>Cancellation</span>
                  <span>Late cancellation</span>
                  <span>No-show</span>
                  <span>Booking cutoff</span>
                </div>
                {plans.length === 0 ? (
                  <StaysEmptyState title="Add a room and a rate plan to set cancellation terms" />
                ) : (
                  plans.map((plan) => {
                    const room = property.rooms?.find((r) => r.id === plan.roomId);
                    return (
                      <div
                        key={plan.id}
                        className="grid min-w-[760px] grid-cols-[1.3fr_1.4fr_1fr_1fr_1fr] items-center gap-3 border-b border-slate-100 px-3 py-3.5 text-sm text-slate-700 last:border-0"
                      >
                        <div>
                          <b className="font-medium text-slate-800">{plan.name}</b>
                          <small className="mt-0.5 block text-xs text-slate-400">{room?.name || "Room"}</small>
                        </div>
                        <span>
                          {plan.cancellation || "Free cancellation"}
                          {plan.cancellation === "Free cancellation" && (
                            <small className="mt-0.5 block text-xs text-slate-400">
                              {plan.freeCancellationHours || 0} hours before arrival
                            </small>
                          )}
                        </span>
                        <span>{plan.penalty || "First night"}</span>
                        <span>{plan.noShow || "Full stay"}</span>
                        <span>{plan.bookingCutoffHours || 0}h before arrival</span>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                {lines.map(([label, value]) => (
                  <PolicyLine key={label} label={label} value={value} />
                ))}
                {note && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-4">
                    <b className="text-sm font-medium text-slate-700">{note.label}</b>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{note.text}</p>
                  </div>
                )}
              </>
            )}
          </StaysCard>

          {tab === "Cancellation & charges" && (
            <StaysCard className="mt-4 max-w-[1000px]">
              <div className="mb-1 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row">
                <div>
                  <h2 className="m-0 text-sm font-semibold text-slate-800">Charges guests should know</h2>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-slate-500">
                    List optional on-site fees. TravioGhana handles the guest booking payment as the OTA.
                  </p>
                </div>
                <StaysButton size="small" onClick={() => openEditor("Cancellation & charges")}>
                  Edit charges
                </StaysButton>
              </div>
              <PolicyLine
                label="Damage deposit"
                value={
                  property.damageDeposit
                    ? `${formatMoney(property.damageDeposit)} · ${policyValue(property, "depositMethod", "handled on arrival")}`
                    : "None specified"
                }
              />
              <PolicyLine
                label="Cleaning fee"
                value={property.cleaningFee ? formatMoney(property.cleaningFee) : "None specified"}
              />
              <PolicyLine
                label="Local taxes"
                value={policyValue(property, "localTax", "Included in displayed rate")}
              />
              {note && (
                <div className="mt-4 rounded-lg bg-slate-50 p-4">
                  <b className="text-sm font-medium text-slate-700">{note.label}</b>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-500">{note.text}</p>
                </div>
              )}
            </StaysCard>
          )}
        </>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Property rules and rate-plan cancellation terms are separate so guests see the terms for the rate they
        book.
      </p>

      <PolicyEditorModal
        key={editorSection?.openKey}
        open={Boolean(editorSection)}
        section={editorSection?.section}
        property={property}
        onClose={() => setEditorSection(null)}
        onSave={(patch) => saveMutation.mutateAsync(patch)}
      />
    </StaysSurface>
  );
}

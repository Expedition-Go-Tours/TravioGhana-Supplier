import { useEffect, useRef, useState } from "react";
import StaysCard from "./StaysCard";
import StaysButton from "./StaysButton";
import RatePlanForm from "./RatePlanForm";
import { planMetaChips, planPrice } from "../utils/ratePlans";
import { formatMoney } from "../utils/money";

/**
 * Rate plans grouped by room type — the prototype's `.rate-room` sections,
 * shared by the Rate page and the builder step so the two can
 * never render a plan differently.
 *
 * The create/edit form opens inline inside the owning room's card (no modal),
 * so the plan being edited always stays in context.
 */
export default function RatePlanCards({
  property,
  onSavePlan,
  onDeletePlan,
  emptyState,
}) {
  const [editing, setEditing] = useState(null); // { roomId, plan? }
  const formRef = useRef(null);

  useEffect(() => {
    if (editing) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [editing]);

  if (!property?.rooms?.length) {
    return emptyState || null;
  }

  return (
    <div className="grid gap-[18px]">
      {property.rooms.map((room) => {
        const plans = (property.ratePlans || []).filter((plan) => plan.roomId === room.id);
        const isEditingThisRoom = editing?.roomId === room.id;
        const isAddingHere = isEditingThisRoom && !editing.plan;
        return (
          <StaysCard key={room.id} as="section">
            <div className="mb-4 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">ROOM TYPE</span>
                <h2 className="mb-0.5 mt-1 text-base font-semibold text-slate-800">{room.name}</h2>
                <p className="m-0 text-sm leading-relaxed text-slate-500">
                  {`${room.count} ${room.count === 1 ? "unit" : "units"} · base room price ${formatMoney(room.price)} / night`}
                </p>
              </div>
              <StaysButton
                variant="primary"
                size="small"
                onClick={() => setEditing({ roomId: room.id })}
                disabled={isAddingHere}
              >
                + Add rate plan
              </StaysButton>
            </div>

            {isEditingThisRoom && (
              <div
                ref={formRef}
                className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/20 p-4 sm:p-5"
              >
                <div className="mb-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {editing.plan?.id ? "Edit rate plan" : "Create rate plan"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {`${room.name} · Configure the offer travellers can book.`}
                  </p>
                </div>
                <RatePlanForm
                  key={editing.plan?.id || "new"}
                  room={room}
                  plan={editing.plan || null}
                  onCancel={() => setEditing(null)}
                  onSave={onSavePlan}
                  onDelete={onDeletePlan}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {plans.length === 0 ? (
                <p className="text-sm text-slate-500">No rate plan yet. Add one to sell this room.</p>
              ) : (
                plans.map((plan) => (
                  <div key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-slate-800">{plan.name}</strong>
                        <small className="mb-3 mt-1 block text-xs leading-relaxed text-slate-500">
                          {`${plan.meal || "Room only"} · ${plan.cancellation || "Free cancellation"}`}
                        </small>
                      </div>
                      <b className="whitespace-nowrap text-base font-semibold text-emerald-700">
                        {formatMoney(planPrice(plan, room))}
                      </b>
                    </div>
                    <div className="mb-[15px] flex flex-wrap gap-[5px]">
                      {planMetaChips(plan).map((chip) => (
                        <span key={chip} className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <StaysButton size="small" onClick={() => setEditing({ roomId: room.id, plan })}>
                      Edit plan
                    </StaysButton>
                  </div>
                ))
              )}
            </div>
          </StaysCard>
        );
      })}
    </div>
  );
}

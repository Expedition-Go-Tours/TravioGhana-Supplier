import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_TEAM_ROLES,
  TEAM_ROLES,
  TEAM_ROLE_COLORS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_ORDER,
  TEAM_ROLE_SUMMARIES,
  isRoleDisabled,
  sortTeamRoles,
  toggleTeamRole,
} from "@/config/teamRoles";

/**
 * Multi-select role picker (chips).
 *
 * A team member can hold up to two roles; Admin already includes everything so
 * it cannot be combined. The picker explains what each role unlocks rather than
 * hiding it behind a tooltip — the invite email says the same thing.
 */
export default function TeamRolePicker({ value, onChange, disabled = false, compact = false }) {
  const selected = sortTeamRoles(value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Team roles">
        {TEAM_ROLE_ORDER.map((role) => {
          const isSelected = selected.includes(role);
          const isDisabled = disabled || isRoleDisabled(selected, role);

          return (
            <button
              key={role}
              type="button"
              aria-pressed={isSelected}
              disabled={isDisabled}
              onClick={() => onChange(toggleTeamRole(selected, role))}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                isSelected
                  ? cn("border-transparent", TEAM_ROLE_COLORS[role])
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                isDisabled && !isSelected && "cursor-not-allowed opacity-40 hover:border-slate-200 hover:text-slate-500",
                disabled && "cursor-not-allowed opacity-60",
              )}
            >
              {isSelected && <Check size={11} />}
              {TEAM_ROLE_LABELS[role]}
            </button>
          );
        })}
      </div>

      {!compact && (
        <ul className="space-y-0.5">
          {selected.length === 0 ? (
            <li className="text-[11px] text-amber-600">Select at least one role.</li>
          ) : (
            selected.map((role) => (
              <li key={role} className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-600">{TEAM_ROLE_LABELS[role]}</span>
                {" — "}
                {TEAM_ROLE_SUMMARIES[role]}
              </li>
            ))
          )}
          {selected.length === MAX_TEAM_ROLES && selected[0] !== TEAM_ROLES.ADMIN && (
            <li className="text-[11px] text-slate-400">Max {MAX_TEAM_ROLES} roles per member.</li>
          )}
        </ul>
      )}
    </div>
  );
}

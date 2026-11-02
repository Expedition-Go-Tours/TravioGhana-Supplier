import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MAX_TEAM_ROLES,
  TEAM_ROLES,
  TEAM_ROLE_COLORS,
  TEAM_ROLE_LABELS,
  TEAM_ROLE_ORDER,
  TEAM_ROLE_SUMMARIES,
} from "@/config/teamRoles";

/**
 * System-role + custom-role picker.
 *
 * The two-role cap is across both kinds: a member can hold Editor + Secretary,
 * or one custom role on its own, but never three roles. Admin is all-inclusive
 * and cannot be combined.
 */
export default function TeamAccessPicker({
  systemRoles = [],
  customRoleIds = [],
  customRoles = [],
  onChange,
  disabled = false,
  compact = false,
}) {
  const selectedSystem = TEAM_ROLE_ORDER.filter((role) => systemRoles.includes(role));
  const selectedCustom = customRoleIds
    .map((id) => customRoles.find((role) => role.id === id))
    .filter(Boolean);
  const total = selectedSystem.length + selectedCustom.length;

  const emit = (nextSystem, nextCustom) => {
    onChange?.({ roles: nextSystem, customRoleIds: nextCustom });
  };

  const toggleSystem = (role) => {
    if (disabled) return;
    if (role === TEAM_ROLES.ADMIN) {
      const already = selectedSystem.length === 1 && selectedSystem[0] === TEAM_ROLES.ADMIN && !selectedCustom.length;
      emit(already ? [] : [TEAM_ROLES.ADMIN], []);
      return;
    }
    if (selectedSystem.includes(TEAM_ROLES.ADMIN)) {
      emit([role], []);
      return;
    }
    if (selectedSystem.includes(role)) {
      emit(selectedSystem.filter((value) => value !== role), selectedCustom.map((item) => item.id));
      return;
    }
    if (total >= MAX_TEAM_ROLES) return;
    emit([...selectedSystem, role], selectedCustom.map((item) => item.id));
  };

  const toggleCustom = (role) => {
    if (disabled) return;
    if (selectedSystem.includes(TEAM_ROLES.ADMIN)) return;
    if (selectedCustom.some((item) => item.id === role.id)) {
      emit(selectedSystem, selectedCustom.filter((item) => item.id !== role.id).map((item) => item.id));
      return;
    }
    if (total >= MAX_TEAM_ROLES) return;
    emit(selectedSystem, [...selectedCustom.map((item) => item.id), role.id]);
  };

  const isSystemDisabled = (role) => {
    if (disabled) return true;
    if (selectedSystem.includes(role)) return false;
    if (selectedSystem.includes(TEAM_ROLES.ADMIN)) return role !== TEAM_ROLES.ADMIN;
    if (role === TEAM_ROLES.ADMIN) return false;
    return total >= MAX_TEAM_ROLES;
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">System roles</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="System roles">
          {TEAM_ROLE_ORDER.map((role) => {
            const selected = selectedSystem.includes(role);
            const disabledRole = isSystemDisabled(role);
            return (
              <button
                key={role}
                type="button"
                aria-pressed={selected}
                disabled={disabledRole && !selected}
                onClick={() => toggleSystem(role)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  selected
                    ? cn("border-transparent", TEAM_ROLE_COLORS[role])
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                  disabledRole && !selected && "cursor-not-allowed opacity-40",
                )}
              >
                {selected && <Check size={11} />}
                {TEAM_ROLE_LABELS[role]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Custom roles
          {!customRoles.length && <span className="font-normal normal-case tracking-normal text-slate-400">— create one in Roles</span>}
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Custom roles">
          {customRoles.map((role) => {
            const selected = selectedCustom.some((item) => item.id === role.id);
            const locked = selectedSystem.includes(TEAM_ROLES.ADMIN);
            const capped = total >= MAX_TEAM_ROLES && !selected;
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled || locked || capped}
                onClick={() => toggleCustom(role)}
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  selected
                    ? "border-transparent bg-emerald-100 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700",
                  (locked || capped) && !selected && "cursor-not-allowed opacity-40",
                )}
                title={role.description || role.name}
              >
                {selected ? <Check size={11} /> : (locked ? <Lock size={10} /> : null)}
                <span className="truncate">{role.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!compact && (
        <ul className="space-y-0.5">
          {selectedSystem.map((role) => (
            <li key={role} className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">{TEAM_ROLE_LABELS[role]}</span>
              {" — "}{TEAM_ROLE_SUMMARIES[role]}
            </li>
          ))}
          {selectedCustom.map((role) => (
            <li key={role.id} className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">{role.name}</span>
              {" — "}{role.description || "Custom access"}
            </li>
          ))}
          {total === 0 && <li className="text-[11px] text-amber-600">Select at least one role.</li>}
          {total >= MAX_TEAM_ROLES && <li className="text-[11px] text-slate-400">Max {MAX_TEAM_ROLES} roles per member.</li>}
        </ul>
      )}
    </div>
  );
}

import { useState } from "react";
import { Plus, ShieldCheck, Pencil, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import RoleEditor from "./RoleEditor";

function summaryFor(role, catalog) {
  const labels = new Map((catalog?.permissions || []).map((permission) => [permission.key, permission.label]));
  const names = (role.permissions || [])
    .filter((key) => key !== "dashboard.view" && key !== "settings.access")
    .map((key) => labels.get(key) || key)
    .slice(0, 3);
  const extra = Math.max(0, (role.permissions || []).length - names.length);
  return names.length ? `${names.join(", ")}${extra ? ` +${extra} more` : ""}` : "No permissions selected";
}

export default function TeamRolesPanel({ roles = [], catalog, loading, canManage, onChanged }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (role) => { setEditing(role); setEditorOpen(true); };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Custom roles</h2>
            <p className="text-xs text-slate-500">Give a teammate exactly the access they need — no more.</p>
          </div>
        </div>
        {canManage && (
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
            <Plus size={14} /> New role
          </button>
        )}
      </div>

      <div className="px-4 py-4 sm:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-emerald-500" /></div>
        ) : roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">No custom roles yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
              Create roles like Secretary, Operations or Finance. You can choose individual pages,
              actions, KPI cards, notification categories and a landing page.
            </p>
            {canManage && (
              <button type="button" className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={openCreate}>
                <Plus size={14} /> Create the first role
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map((role) => (
              <div key={role.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{role.name}</p>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      role.memberCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                    )}>
                      {role.memberCount || 0} member{role.memberCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  {role.description && <p className="mt-0.5 text-xs text-slate-500">{role.description}</p>}
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{summaryFor(role, catalog)}</p>
                </div>
                {canManage && (
                  <button type="button" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50" onClick={() => openEdit(role)}>
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <RoleEditor
        open={editorOpen}
        catalog={catalog}
        role={editing}
        onClose={() => setEditorOpen(false)}
        onSaved={() => onChanged?.()}
      />
    </div>
  );
}

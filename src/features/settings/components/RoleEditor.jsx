import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, X, Archive, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { PAGE_ACCESS, canOpenPath } from "@/config/pageAccess";
import { cn } from "@/lib/utils";
import { createTeamRole, updateTeamRole, archiveTeamRole } from "../api";

const LANDING_LABELS = {
  "/": "Dashboard",
  "/bookings": "Bookings",
  "/products": "Products",
  "/pickup-planner": "Pickup planner",
  "/availability": "Availability",
  "/chat": "Customers / Chat",
  "/reviews": "Reviews",
  "/finance": "Finance",
  "/analytics": "Analytics",
  "/notifications": "Notifications",
  "/cancellation-rate": "Cancellation rate",
  "/verification": "Verification",
  "/settings": "Settings",
};

function gatherRequires(permission, catalogMap) {
  const keys = [];
  const visit = (key) => {
    const meta = catalogMap.get(key);
    for (const required of meta?.requires || []) {
      if (!keys.includes(required)) {
        keys.push(required);
        visit(required);
      }
    }
  };
  visit(permission);
  return keys;
}

function collectDependents(key, selected, catalogMap) {
  const removed = new Set([key]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const selectedKey of [...selected]) {
      if (removed.has(selectedKey)) continue;
      const meta = catalogMap.get(selectedKey);
      if ((meta?.requires || []).some((required) => removed.has(required))) {
        removed.add(selectedKey);
        changed = true;
      }
    }
  }
  return removed;
}

export default function RoleEditor({ open, catalog, role, onClose, onSaved }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [landingPath, setLandingPath] = useState("");
  const [notificationCategories, setNotificationCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const catalogMap = useMemo(
    () => new Map((catalog?.permissions || []).map((permission) => [permission.key, permission])),
    [catalog],
  );
  const groups = catalog?.groups || [];
  const visiblePermissions = (catalog?.permissions || []).filter((permission) => !permission.ownerOnly);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setName(role?.name || "");
      setDescription(role?.description || "");
      setSelected(new Set(role?.permissions || []));
      setLandingPath(role?.landingPath || "");
      setNotificationCategories(role?.notificationCategories || []);
    });
    return () => { cancelled = true; };
  }, [open, role]);

  const landingOptions = useMemo(() => {
    const hasSelectedPermission = (key) => selected.has(key) || selected.has("*");
    return Object.keys(PAGE_ACCESS)
      .filter((path) => canOpenPath(hasSelectedPermission, path))
      .map((path) => ({ path, label: LANDING_LABELS[path] || path }));
  }, [selected]);

  const togglePermission = (key) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        const removed = collectDependents(key, next, catalogMap);
        for (const value of removed) next.delete(value);
      } else {
        next.add(key);
        for (const required of gatherRequires(key, catalogMap)) next.add(required);
      }
      return next;
    });
  };

  const toggleCategory = (key) => {
    setNotificationCategories((current) => (
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    ));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Give the role a name");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one permission");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        permissions: [...selected],
        landingPath: landingPath || null,
        notificationCategories,
      };
      const saved = role
        ? await updateTeamRole(role.id, { ...payload, version: role.version })
        : await createTeamRole(payload);
      toast.success(role ? "Role updated" : "Role created");
      onSaved?.(saved);
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save the role");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!role) return;
    setArchiving(true);
    try {
      await archiveTeamRole(role.id);
      toast.success("Role archived");
      onSaved?.(null);
      onClose?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not archive the role");
    } finally {
      setArchiving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6" onClick={onClose}>
      <div
        className="my-4 w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{role ? `Edit ${role.name}` : "Create a role"}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Choose exactly what this role can open, do and see. The server enforces every toggle.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Role name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Secretary" maxLength={50} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Landing page</label>
              <Select value={landingPath || "__default"} onValueChange={(value) => setLandingPath(value === "__default" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default">First allowed page</SelectItem>
                  {landingOptions.map((option) => (
                    <SelectItem key={option.path} value={option.path}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Handles bookings and customer messages" maxLength={200} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>

          <div className="space-y-4">
            {groups.map((group) => {
              const rows = visiblePermissions.filter((permission) => permission.group === group.key);
              if (!rows.length) return null;
              return (
                <section key={group.key}>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">{group.label}</h3>
                  <p className="mb-2 text-[11px] text-slate-400">{group.description}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {rows.map((permission) => {
                      const checked = selected.has(permission.key);
                      return (
                        <label
                          key={permission.key}
                          className={cn(
                            "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors",
                            checked ? "border-emerald-300 bg-emerald-50/60" : "border-slate-200 bg-white hover:border-slate-300",
                            permission.sensitive && "border-l-2 border-l-amber-300",
                          )}
                        >
                          <span className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white",
                          )}>
                            {checked && <Check size={11} />}
                          </span>
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => togglePermission(permission.key)} />
                          <span className="min-w-0">
                            <span className="block text-xs font-medium text-slate-700">{permission.label}</span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{permission.description}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Notifications</h3>
            <p className="mb-2 text-[11px] text-slate-400">Which notification categories appear in this role's inbox.</p>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.notificationCategories || []).map((category) => {
                const checked = notificationCategories.includes(category.key);
                return (
                  <button
                    key={category.key}
                    type="button"
                    aria-pressed={checked}
                    onClick={() => toggleCategory(category.key)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                      checked ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                    )}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
          <div>
            {role && (
              <button type="button" onClick={handleArchive} disabled={archiving || (role.memberCount || 0) > 0} title={(role.memberCount || 0) > 0 ? "Reassign members first" : "Archive role"} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                {archiving ? <Loader2 size={13} className="animate-spin" /> : <Archive size={13} />} Archive
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save role
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

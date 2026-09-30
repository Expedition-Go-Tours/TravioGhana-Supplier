import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { updateProperty } from "../api";

/**
 * The builder's working copy of a property with debounced autosave.
 *
 * Edits apply to local state immediately (so typing never stutters) and are
 * queued into a single PATCH 700ms after the last change. `flush()` forces
 * the queued patch out and is awaited by the builder's exit and submit
 * actions; `isSaving` / `lastSavedAt` drive the footer's save indicator.
 * The step cursor (`property.step`) travels through the same queue.
 */
export function useStaysDraft(property) {
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const dirty = useRef({});
  const timer = useRef(null);
  const idRef = useRef(null);

  useEffect(() => {
    if (property?.id && property.id !== idRef.current) {
      idRef.current = property.id;
      dirty.current = {};
      setDraft(property);
    }
  }, [property]);

  const flush = useCallback(async () => {
    const payload = dirty.current;
    dirty.current = {};
    if (!idRef.current || Object.keys(payload).length === 0) return;
    setIsSaving(true);
    try {
      await updateProperty(idRef.current, payload);
      setLastSavedAt(Date.now());
    } finally {
      setIsSaving(false);
    }
  }, []);

  const patch = useCallback(
    (changes) => {
      setDraft((current) => (current ? { ...current, ...changes } : current));
      dirty.current = { ...dirty.current, ...changes };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush().catch(() => toast.error("Could not save changes — check your connection"));
      }, 700);
    },
    [flush],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { draft, patch, flush, isSaving, lastSavedAt };
}

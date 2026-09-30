import { useRef, useState } from "react";
import { toast } from "sonner";
import { Footnote } from "./stepBits";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * STEP 8 — Photos. The prototype capped files at 700KB because it stored
 * data URLs in localStorage; the workspace keeps files in memory (mock) or
 * uploads them (live), so the cap is 2MB per image with a clear message.
 * The first photo is the cover, matching the prototype's copy.
 */
export default function Step08Photos({ property, onAddPhotos, onRemovePhoto }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const photos = property.photos || [];

  const handleFiles = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;

    const accepted = [];
    for (const file of files.slice(0, 5)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 2MB — try a smaller file`);
        continue;
      }
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      accepted.push(dataUrl);
    }
    if (!accepted.length) return;

    setBusy(true);
    try {
      await onAddPhotos(accepted);
    } catch {
      toast.error("Could not add the photos");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
        <strong className="text-sm font-semibold text-slate-800">Upload property photos</strong>
        <p className="mb-4 mt-2 text-sm text-slate-500">
          Add a clear exterior, rooms, bathrooms and shared spaces. The first photo becomes the cover.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-xl border border-emerald-200/60 bg-white px-4 py-2.5 text-sm font-medium text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          {busy ? "Adding…" : "Choose photos"}
        </button>
      </div>

      {photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-[9px]">
          {photos.map((photo, index) => (
            <div key={`${index}-${photo.slice(0, 24)}`} className="relative">
              <img
                src={photo}
                alt={`Property photo ${index + 1}${index === 0 ? " (cover)" : ""}`}
                className="h-[70px] w-[90px] rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-50 text-xs text-red-500 shadow"
              >
                ×
              </button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Footnote>
        Photos are kept with the listing for this session. {photos.length > 0 ? `${photos.length} added.` : ""}
      </Footnote>
    </>
  );
}

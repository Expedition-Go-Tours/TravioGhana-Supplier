import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, ChevronLeft, Image as ImageIcon, ThumbsUp, X } from "lucide-react";
import StaysButton from "../components/StaysButton";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MIN_PHOTOS = 5;

/**
 * STEP 3 — Photos. The reference page ("What does your place look like?"): a
 * large upload card with a drag-and-drop zone, next to a dismissible tips
 * card, closed by the back-arrow + Continue footer. The blue accents of the
 * reference are the stays emerald here.
 *
 * The workspace keeps files in memory (mock) or uploads them (live), so the
 * per-file cap is 2MB rather than Booking's 47MB. The first photo is the
 * cover, matching the prototype's copy.
 */
export default function Step03Photos({
  property,
  onAddPhotos,
  onRemovePhoto,
  onBack,
  onNext,
  onSave,
  saving = false,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(true);
  const photos = property.photos || [];

  const addFiles = async (files) => {
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

  const handleInput = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    addFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    addFiles([...(event.dataTransfer?.files || [])]);
  };

  const handleContinue = async () => {
    if (saving || photos.length < MIN_PHOTOS) return;
    try {
      await onSave?.();
    } catch {
      // The draft hook reports save failures; still move on like the builder.
    }
    onNext?.();
  };

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-[40px]">
        What does your place look like?
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:mt-10 lg:grid-cols-3">
        {/* Upload card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7 lg:col-span-2">
          <p className="text-base leading-relaxed text-slate-800 md:text-lg">
            <strong className="font-bold">Upload at least 5 photos of your property.</strong> The
            more you upload, the more likely you are to get bookings. You can add more later.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleInput}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mt-6 flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors md:min-h-[340px] ${
              dragging ? "border-emerald-500 bg-emerald-50/40" : "border-slate-400 bg-white"
            }`}
          >
            <span className="grid h-[104px] w-[150px] place-items-center rounded-xl bg-slate-100 text-slate-300">
              <ImageIcon size={56} aria-hidden="true" />
            </span>
            <p className="text-base font-bold text-slate-800 md:text-lg">Drag and drop or</p>
            <StaysButton
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50"
            >
              <Camera size={18} aria-hidden="true" />
              {busy ? "Adding…" : "Upload photos"}
            </StaysButton>
            <p className="text-sm text-slate-500 md:text-base">
              jpg/jpeg or png, maximum 2MB each
            </p>
          </div>

          {photos.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-[9px]">
              {photos.map((photo, index) => (
                <div key={`${index}-${photo.slice(0, 24)}`} className="relative">
                  <img
                    src={photo}
                    alt={`Property photo ${index + 1}${index === 0 ? " (cover)" : ""}`}
                    className="h-[80px] w-[104px] rounded-lg object-cover"
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
        </div>

        {/* Tips card */}
        {tipsOpen && (
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 md:p-7 lg:col-span-1">
            <div className="flex items-start gap-3 md:gap-4">
              <ThumbsUp size={28} className="mt-0.5 shrink-0 text-slate-800" aria-hidden="true" />
              <h2 className="min-w-0 flex-1 text-lg font-bold leading-snug text-slate-900 md:text-xl">
                What if I don&apos;t have professional photos?
              </h2>
              <button
                type="button"
                onClick={() => setTipsOpen(false)}
                aria-label="Dismiss photo tips"
                className="shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              No problem! You can use a smartphone or a digital camera. Here are some tips for
              taking great photos of your property
            </p>

            <button
              type="button"
              onClick={() => toast("Photo tips are coming soon")}
              className="mt-4 block text-left text-sm font-medium text-emerald-700 underline underline-offset-2 transition-colors hover:text-emerald-800 md:text-base"
            >
              Here are some tips for taking great photos of your property
            </button>

            <p className="mt-4 text-sm leading-relaxed text-slate-700 md:text-base">
              If you don&apos;t know who took a photo, it&apos;s best to avoid using it. Only use
              photos others have taken if you have permission.
            </p>
          </aside>
        )}
      </div>

      <div className="mt-10 flex items-center gap-3">
        <StaysButton
          aria-label="Back"
          onClick={() => onBack?.()}
          className="h-14 w-14 shrink-0 p-0"
        >
          <ChevronLeft size={20} />
        </StaysButton>
        <StaysButton
          variant="primary"
          className="h-14 flex-1 text-base"
          disabled={photos.length < MIN_PHOTOS || saving}
          onClick={handleContinue}
        >
          {saving ? "Saving…" : "Continue"}
        </StaysButton>
      </div>
    </div>
  );
}

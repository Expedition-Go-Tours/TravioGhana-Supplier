import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Copy } from "lucide-react";
import logoSrc from "@/assets/TravioGhana_Logo.svg";
import { parseReviewLink } from "@/lib/reviewShare";

/**
 * Public copy page for the supplier review-invite email.
 *
 * Email clients strip JavaScript, so the "Copy link" chip in the email cannot
 * write to the clipboard. The email links here instead: a normal browser page
 * that can use the Clipboard API, with a selectable URL as the fallback.
 */
function legacyCopy(value) {
  try {
    if (typeof document.execCommand !== "function") return false;
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

function Shell({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white px-6 py-5 sm:px-8">
          <img src={logoSrc} alt="Travio Ghana" className="h-8 w-auto" />
        </div>
        <div className="px-6 py-6 sm:px-8">{children}</div>
      </div>
    </main>
  );
}

export default function ReviewLinkSharePage() {
  const [searchParams] = useSearchParams();
  const parsed = parseReviewLink(searchParams.get("url"));
  const guest = (searchParams.get("guest") || "").trim();
  const tour = (searchParams.get("tour") || "").trim();
  const url = "url" in parsed ? parsed.url : "";
  const guestLabel = guest || "your guest";

  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState(false);
  const urlRef = useRef(null);
  const resetTimer = useRef(null);

  useEffect(() => {
    const previous = document.title;
    document.title = "Copy review link · Travio Ghana";
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const markCopied = () => {
    setManual(false);
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2200);
  };

  const selectUrl = () => {
    const node = urlRef.current;
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleCopy = async () => {
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else if (!legacyCopy(url)) {
        throw new Error("Clipboard unavailable");
      }
      markCopied();
    } catch {
      if (legacyCopy(url)) {
        markCopied();
        return;
      }
      setCopied(false);
      setManual(true);
      selectUrl();
    }
  };

  if (!url) {
    return (
      <Shell>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h1 className="text-base font-bold text-amber-900">This copy link is not valid</h1>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">
              {parsed.error === "missing"
                ? "The link is missing a review URL. Open the original email and try again."
                : "The review URL in this link is not one we recognise. Open the original email and try again, or select the review link directly."}
            </p>
          </div>
        </div>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
        Guest review link
      </p>
      <h1 className="mt-2 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
        Send the review link to {guestLabel}
      </h1>
      {tour && <p className="mt-1 break-words text-sm text-slate-500">{tour}</p>}

      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        Copy this link and send it to your guest in WhatsApp, SMS or email. It opens the review
        form for this booking.
      </p>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p
          ref={urlRef}
          className="break-all font-mono text-xs leading-relaxed text-slate-700"
          data-testid="review-url"
        >
          {url}
        </p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {copied ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
        {copied ? "Copied" : "Copy link"}
      </button>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-5 text-center text-xs leading-relaxed ${
          manual ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {copied
          ? "Link copied. Paste it into WhatsApp, SMS or an email."
          : manual
            ? "Couldn't copy automatically. The link is selected — press Cmd/Ctrl+C."
            : " "}
      </p>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-700"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
      </div>
    </Shell>
  );
}

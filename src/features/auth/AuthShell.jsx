import wordmark from "@/assets/travio-ghana-wordmark.png";

const STOREFRONT_URL = "https://www.travioghana.com";

/** The icon chip is the only place a status colour is allowed. */
const ICON_TONES = {
  primary: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

/**
 * The one shell every auth screen renders inside.
 *
 * Login, forgot-password, reset-password and the OAuth callback each used to
 * build their own page, so the product had three cards, three logo treatments
 * and three focus conventions. This is the fourth and only one.
 *
 * The form sits directly on the page background: no white panel, no shadow, no
 * rounded corners. The controls carry their own edges, so the page stays a flat
 * single column — wordmark, fields, footer — the way GetYourGuide and Viator
 * lay out sign-in.
 *
 * The wordmark links to the public site, not `/`: nobody is signed in on this
 * screen, and `/` would bounce them straight back here.
 */
export default function AuthShell({
  icon: Icon,
  iconTone = "primary",
  iconClassName = "",
  title,
  subtitle,
  children,
  footer,
  titleId = "auth-heading",
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
      <div className="w-full max-w-[420px]">
        <a
          href={STOREFRONT_URL}
          className="mx-auto mb-10 flex w-fit p-1 transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40"
        >
          <img
            src={wordmark}
            alt="Travio Ghana, an Expedition-Go Tours company"
            className="h-14 w-auto"
          />
        </a>

        <main>
          {Icon && (
            <div
              className={`mb-6 flex h-12 w-12 items-center justify-center ${
                ICON_TONES[iconTone] || ICON_TONES.primary
              }`}
            >
              <Icon size={22} className={iconClassName} aria-hidden="true" />
            </div>
          )}

          {title && (
            <h1
              id={titleId}
              className="text-[30px] font-semibold leading-10 tracking-[-0.03em] text-slate-900"
            >
              {title}
            </h1>
          )}

          {subtitle && (
            <p className="mt-2 text-[15px] leading-6 text-slate-500">{subtitle}</p>
          )}

          <div className={title ? "mt-8" : "mt-0"}>{children}</div>
        </main>

        {footer && (
          <div className="mt-10 text-center text-xs leading-5 text-slate-500">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

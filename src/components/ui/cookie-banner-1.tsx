"use client";

import { useEffect, useRef, useState } from "react";
import { Cookie, Shield, Info, X, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Prefs = {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

const CONSENT_KEY = "cookie-consent";
const PREFS_KEY = "cookie-preferences";
const OPEN_EVENT = "cookie-preferences:open";

const NONE: Prefs = { necessary: true, functional: false, analytics: false, marketing: false };
const ALL: Prefs = { necessary: true, functional: true, analytics: true, marketing: true };

/** The visitor's saved choice, or null when they haven't made one. Storage can throw in private modes. */
export function readCookiePrefs(): Prefs | null {
  try {
    if (!localStorage.getItem(CONSENT_KEY)) return null;
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? { ...NONE, ...(JSON.parse(stored) as Partial<Prefs>), necessary: true } : null;
  } catch {
    return null;
  }
}

/** Reopens the panel with the preferences expanded, e.g. from a "Cookie settings" link. */
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function PrefRow({
  title,
  desc,
  checked,
  onToggle,
  locked,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg border border-border">
      <button
        type="button"
        disabled={locked}
        onClick={() => !locked && onToggle()}
        className={cn(
          "mt-0.5 inline-flex size-5 items-center justify-center rounded border",
          locked
            ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
            : "bg-background border-border hover:bg-accent cursor-pointer"
        )}
        aria-pressed={checked}
        aria-label={`${title} cookie preference`}
      >
        {checked && <Check className="size-4" />}
      </button>

      <div className="flex-1">
        <div className="text-xs font-medium">
          {title} {locked && <span className="text-[10px] text-muted-foreground">(required)</span>}
        </div>

        <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

interface CookiePanelProps {
  title?: string;
  message?: string;
  acceptText?: string;
  rejectText?: string;
  customizeText?: string;
  icon?: "cookie" | "shield" | "info";
  className?: string;
  privacyHref?: string;
  termsHref?: string;
  /** Called with the final choice whenever the visitor accepts, rejects or saves preferences. */
  onConsent?: (prefs: Prefs) => void;
}

const CookiePanel = (props: CookiePanelProps) => {
  const {
    title = "This site uses cookies",
    message = "We use cookies to enhance your experience.",
    acceptText = "Accept all",
    rejectText = "Necessary only",
    customizeText = "Customize",
    icon = "cookie",
    className,
    privacyHref = "/privacy",
    termsHref,
    onConsent,
  } = props;

  const [visible, setVisible] = useState(false);
  const [render, setRender] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(NONE);

  const prefsRef = useRef<HTMLDivElement | null>(null);
  const [prefsHeight, setPrefsHeight] = useState<number>(0);

  useEffect(() => {
    // Storage is only readable after hydration; show the panel on the next frame when no choice is saved.
    const frame = readCookiePrefs()
      ? 0
      : requestAnimationFrame(() => {
          setRender(true);
          requestAnimationFrame(() => setVisible(true));
        });

    const reopen = () => {
      setPrefs(readCookiePrefs() ?? NONE);
      setShowPrefs(true);
      setRender(true);
      requestAnimationFrame(() => setVisible(true));
    };
    window.addEventListener(OPEN_EVENT, reopen);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener(OPEN_EVENT, reopen);
    };
  }, []);

  useEffect(() => {
    if (showPrefs && prefsRef.current) {
      setPrefsHeight(prefsRef.current.scrollHeight);
    } else {
      setPrefsHeight(0);
    }
  }, [showPrefs, prefs]);

  const hide = () => {
    setVisible(false);
    setTimeout(() => setRender(false), 300);
  };

  const commit = (next: Prefs) => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      localStorage.setItem(CONSENT_KEY, "true");
    } catch {}
    setPrefs(next);
    setShowPrefs(false);
    onConsent?.(next);
    hide();
  };

  const toggle = (field: keyof Prefs) => setPrefs((p) => ({ ...p, [field]: !p[field] }));

  if (!render) return null;

  const IconEl = icon === "shield" ? Shield : icon === "info" ? Info : Cookie;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className={cn("fixed right-4 bottom-4 md:right-6 md:bottom-6", "z-50 w-[360px] max-w-[90vw]")}
    >
      <div
        className={cn(
          "relative border border-border/70 rounded-xl bg-card/95 text-card-foreground shadow-xl backdrop-blur",
          "p-4 flex flex-col gap-3",
          visible
            ? cn("animate-in", "fade-in", "slide-in-from-bottom-8")
            : cn("animate-out", "fade-out", "slide-out-to-bottom-8"),
          "duration-300 ease-out",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <IconEl className="size-5" aria-hidden="true" />
          </span>

          <h2 className="text-sm font-semibold leading-5">{title}</h2>

          <button
            type="button"
            onClick={hide}
            className="ml-auto inline-flex size-8 items-center justify-center rounded-md hover:bg-foreground/5 cursor-pointer"
            aria-label="Close cookie banner"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          {message} See our{" "}
          <a href={privacyHref} className="underline underline-offset-4 hover:text-foreground cursor-pointer">
            Privacy Policy
          </a>
          {termsHref ? (
            <>
              {" "}and{" "}
              <a href={termsHref} className="underline underline-offset-4 hover:text-foreground cursor-pointer">
                Terms & Conditions
              </a>
            </>
          ) : null}
          .
        </p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrefs((p) => !p)}
            className={cn(
              "h-11 px-3 sm:h-10 rounded-md border border-border/70 cursor-pointer",
              "bg-muted text-muted-foreground text-xs",
              "hover:bg-muted/80 transition-colors flex items-center gap-1"
            )}
            aria-expanded={showPrefs}
            aria-controls="cookie-preferences-inline"
          >
            {customizeText}
            {showPrefs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>

          <button
            type="button"
            onClick={() => commit(NONE)}
            className="ml-auto h-11 px-3 sm:h-10 rounded-md border border-border/70 text-xs cursor-pointer hover:bg-muted transition-colors"
          >
            {rejectText}
          </button>

          <button
            type="button"
            onClick={() => commit(ALL)}
            className={cn(
              "h-11 w-full px-5 sm:h-10 rounded-md text-sm font-medium cursor-pointer",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors"
            )}
          >
            {acceptText}
          </button>
        </div>

        <div
          id="cookie-preferences-inline"
          ref={prefsRef}
          style={{ height: prefsHeight ? `${prefsHeight}px` : 0 }}
          className={cn("overflow-hidden transition-[height] duration-300 ease-out will-change-[height]")}
        >
          {showPrefs && (
            <div className="mt-2 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <PrefRow title="Strictly necessary" desc="Required for site functionality." checked={prefs.necessary} onToggle={() => toggle("necessary")} locked />

              <PrefRow title="Functional" desc="Remembers your preferences." checked={prefs.functional} onToggle={() => toggle("functional")} />

              <PrefRow title="Analytics" desc="Helps us improve the site." checked={prefs.analytics} onToggle={() => toggle("analytics")} />

              <PrefRow title="Marketing" desc="Personalized ads." checked={prefs.marketing} onToggle={() => toggle("marketing")} />

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setShowPrefs(false)}
                  className="px-2.5 py-1 rounded-md border border-border bg-muted text-muted-foreground text-xs hover:bg-muted/80 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => commit(prefs)}
                  className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs hover:bg-primary/90 cursor-pointer"
                >
                  Save preferences
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { CookiePanel };

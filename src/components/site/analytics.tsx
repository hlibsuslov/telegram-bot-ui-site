"use client";

// Google Analytics 4. Page views (including client-side navigation), outbound links and file downloads come
// from GA's enhanced measurement; this adds what it can't see: every button/link click with its label and
// position in the visit (click depth), scroll milestones per page, and time spent before leaving.
// Loads on the production deployment (Vercel sets NEXT_PUBLIC_VERCEL_ENV) or wherever NEXT_PUBLIC_GA_ID
// is set, so local and preview builds don't pollute the reports.

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Checked against the GA4 format because it is inlined into the init script.
const PRODUCTION_GA_ID = "G-1HKSEFE4Q1";
const configuredId = process.env.NEXT_PUBLIC_GA_ID ?? (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? PRODUCTION_GA_ID : "");
const GA_ID = /^G-[A-Z0-9]+$/.test(configuredId) ? configuredId : undefined;
const SCROLL_MARKS = [25, 50, 75, 100];

type Gtag = (command: "event" | "config" | "consent" | "js", ...args: unknown[]) => void;

/** Sends a GA4 event; a no-op when analytics is off. */
export function track(name: string, params: Record<string, string | number | boolean | undefined> = {}) {
  (window as unknown as { gtag?: Gtag }).gtag?.("event", name, params);
}

function labelOf(el: HTMLElement): string {
  const text = el.dataset.analytics ?? el.getAttribute("aria-label") ?? el.textContent ?? "";
  return text.replace(/\s+/g, " ").trim().slice(0, 100) || el.tagName.toLowerCase();
}

function sectionOf(el: HTMLElement): string | undefined {
  const section = el.closest<HTMLElement>("section[id], [data-section], section[aria-labelledby], nav, header, footer");
  if (!section) return undefined;
  return section.dataset.section || section.id || section.getAttribute("aria-labelledby") || section.tagName.toLowerCase();
}

function useClickDepth() {
  useEffect(() => {
    let depth = 0;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a, button, [role='button'], [role='tab'], [role='radio'], summary");
      if (!el) return;
      depth += 1;
      const href = el instanceof HTMLAnchorElement ? el.getAttribute("href") ?? undefined : undefined;
      track("ui_click", {
        click_label: labelOf(el),
        click_type: el instanceof HTMLAnchorElement ? "link" : "button",
        click_section: sectionOf(el),
        link_url: href,
        click_depth: depth,
      });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
}

function useScrollAndTime(pathname: string) {
  useEffect(() => {
    const started = performance.now();
    const reached = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const percent = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);
      for (const mark of SCROLL_MARKS) {
        if (percent >= mark && !reached.has(mark)) {
          reached.add(mark);
          track("scroll_depth", { percent_scrolled: mark, page_path: pathname });
        }
      }
    };
    const onLeave = () => {
      if (document.visibilityState !== "hidden") return;
      track("page_engagement", {
        page_path: pathname,
        engaged_seconds: Math.round((performance.now() - started) / 1000),
        max_scroll: Math.max(0, ...reached),
        transport_type: "beacon",
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onLeave);
    };
  }, [pathname]);
}

function Trackers() {
  const pathname = usePathname();
  useClickDepth();
  useScrollAndTime(pathname);
  return null;
}

export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});
gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
      <Trackers />
    </>
  );
}

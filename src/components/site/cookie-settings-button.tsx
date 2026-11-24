"use client";

import { openCookiePreferences } from "@/components/ui/cookie-banner-1";
import { cn } from "@/lib/utils";

export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={openCookiePreferences} className={cn("cursor-pointer underline-offset-4 hover:underline", className)}>
      Cookie settings
    </button>
  );
}

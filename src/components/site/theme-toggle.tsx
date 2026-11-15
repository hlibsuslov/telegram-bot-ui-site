"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { readPreference, setPreference, subscribe, type ThemePreference } from "@/lib/theme";

// Adapted from the 21st.dev "Theme Toggle" block: one icon button that cycles
// light → dark → system.
const NEXT: Record<ThemePreference, ThemePreference> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<ThemePreference, string> = { light: "Light", dark: "Dark", system: "System" };
const ICON = { light: Sun, dark: Moon, system: Monitor } satisfies Record<ThemePreference, typeof Sun>;

export function ThemeToggle() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system" as const);
  const Icon = ICON[preference];
  const next = NEXT[preference];

  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Theme: ${LABEL[preference]}. Switch to ${LABEL[next].toLowerCase()}.`}
      title={`Theme: ${LABEL[preference]}`}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.75} />
    </button>
  );
}

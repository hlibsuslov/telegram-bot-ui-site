import { Undo2 } from "lucide-react";

// A drawn Studio screen editor: one button label changed, the message preview following it and
// the diff the save writes into the bot's repository (screens/entry.start.json).

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Key({ children, tone, edited }: { children: React.ReactNode; tone?: "primary"; edited?: boolean }) {
  return (
    <span
      className="flex h-7 flex-1 items-center justify-center rounded-md px-2 text-center text-[11px] font-medium text-white"
      style={{
        background: tone === "primary" ? "var(--chat-primary)" : "var(--chat-key)",
        outline: edited ? "2px solid var(--brand)" : undefined,
        outlineOffset: edited ? 2 : undefined,
      }}
    >
      {children}
    </span>
  );
}

export function ScreenEditMock() {
  return (
    <div role="img" aria-label="The Studio screen editor: the label of “Repeat my usual” is changed to “Same as last time”, the preview shows the new button, and the diff shows one changed line in screens/entry.start.json." className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-32px_rgb(16_24_40/0.3)]">
      <div aria-hidden="true" className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-xs">
        <span className="truncate">
          <span className="text-muted-foreground">Brewline › Screens › </span>
          <span className="font-mono font-medium">entry.start</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900 dark:bg-amber-900 dark:text-amber-50">1 draft change</span>
          <Undo2 className="size-3.5 text-muted-foreground" />
        </span>
      </div>
      <div aria-hidden="true" className="grid gap-4 p-4 sm:grid-cols-[1fr_1.05fr]">
        <div className="space-y-3">
          <Field label="Button label · English">
            <div className="rounded-md border-2 border-brand bg-background px-2.5 py-1.5 text-sm">
              Same as last time<span className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-foreground motion-reduce:animate-none" />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              was <span className="line-through">Repeat my usual</span>
            </p>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Leads to">
              <div className="truncate rounded-md border border-border px-2 py-1.5 font-mono text-xs">checkout.review</div>
            </Field>
            <Field label="Colour">
              <div className="truncate rounded-md border border-border px-2 py-1.5 text-xs">default</div>
            </Field>
          </div>
          <Field label="Sets">
            <div className="flex flex-wrap gap-1">
              {["drink = flat_white", "cup.size = m", "milk = oat"].map((s) => (
                <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          </Field>
        </div>
        <div className="rounded-xl p-3" style={{ background: "linear-gradient(160deg, var(--chat-wall), var(--chat-wall-2))" }}>
          <div className="rounded-xl rounded-bl-sm px-3 py-2 text-[12.5px] leading-snug" style={{ background: "var(--chat-bubble)", color: "var(--chat-text)" }}>
            <p className="font-semibold">Brewline ☕</p>
            <p>Order ahead and skip the line. Your usual is two taps away.</p>
          </div>
          <div className="mt-1 space-y-1">
            <div className="flex gap-1">
              <Key tone="primary">☕ Menu</Key>
            </div>
            <div className="flex gap-1">
              <Key edited>Same as last time</Key>
            </div>
            <div className="flex gap-1">
              <Key>📦 My order</Key>
              <Key>⭐ Loyalty card</Key>
            </div>
          </div>
        </div>
      </div>
      <div aria-hidden="true" className="border-t border-border bg-muted/40 px-4 py-3 font-mono text-[11.5px] leading-5">
        <p className="text-muted-foreground">$ git diff bot-ui/screens/entry.start.json</p>
        <p className="text-danger">-        &quot;en&quot;: &quot;Repeat my usual&quot;,</p>
        <p className="text-success">+        &quot;en&quot;: &quot;Same as last time&quot;,</p>
      </div>
    </div>
  );
}

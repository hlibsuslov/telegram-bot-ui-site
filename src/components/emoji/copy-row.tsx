"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copy } from "./saved";

export function CopyRow({ label, value, accessibleLabel = label }: { label: string; value: string; accessibleLabel?: string }) {
  const [status, setStatus] = useState("");
  return (
    <div>
      <p className="tg-hint mb-1 text-[13px]">{label}</p>
      <div className="tg-field flex items-center rounded-xl pl-3">
        <code className="min-w-0 flex-1 truncate py-2 font-mono text-[13px]" title={value}>{value}</code>
        <button
          type="button" aria-label={`Copy ${accessibleLabel}`}
          onClick={async () => {
            const copied = await copy(value);
            setStatus(copied ? "Copied to clipboard" : "Clipboard unavailable. Select and copy the text.");
            if (copied) setTimeout(() => setStatus(""), 1500);
          }}
          className="tg-cell inline-flex size-9 shrink-0 items-center justify-center rounded-xl"
        >
          {status === "Copied to clipboard" ? <Check aria-hidden="true" className="size-4 text-emerald-500" /> : <Copy aria-hidden="true" className="tg-hint size-4" />}
        </button>
      </div>
      <p role="status" className={status.startsWith("Clipboard unavailable") ? "tg-hint mt-1 text-xs" : "sr-only"}>{status}</p>
    </div>
  );
}

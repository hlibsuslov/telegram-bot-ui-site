import { cn } from "@/lib/utils";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-5", className)}>
      Emoji packs belong to their authors and are served by Telegram. This library only links to them: we do not host,
      review or endorse them, their content can change at any time without notice, and we take no responsibility for it.
      To report a pack, use Telegram&apos;s own reporting.
    </p>
  );
}

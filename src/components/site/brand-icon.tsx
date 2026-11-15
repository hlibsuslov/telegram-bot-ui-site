import Image from "next/image";
import { FileText, SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { GithubMark } from "./section";

// Logos from the svgl.app library (public/logos); trademarks of their owners,
// shown only to say which tools the skill works with.
const LOGOS = {
  claude: { light: "/logos/claude-code.svg" },
  codex: { light: "/logos/openai.svg", dark: "/logos/openai-dark.svg" },
  cursor: { light: "/logos/cursor.svg", dark: "/logos/cursor-dark.svg" },
  gemini: { light: "/logos/gemini.svg" },
  antigravity: { light: "/logos/antigravity.svg" },
  copilot: { light: "/logos/copilot.svg", dark: "/logos/copilot-dark.svg" },
  python: { light: "/logos/python.svg" },
} satisfies Record<string, { light: string; dark?: string }>;

export type BrandKey = keyof typeof LOGOS | "github" | "terminal" | "file";

export function BrandIcon({ name, className }: { name: BrandKey; className?: string }) {
  const size = cn("size-4 shrink-0", className);
  switch (name) {
    case "github":
      return <GithubMark className={size} />;
    case "terminal":
      return <SquareTerminal aria-hidden="true" className={size} strokeWidth={1.75} />;
    case "file":
      return <FileText aria-hidden="true" className={size} strokeWidth={1.75} />;
    default: {
      const logo: { light: string; dark?: string } = LOGOS[name];
      return (
        <>
          <Image src={logo.light} alt="" width={16} height={16} className={cn(size, "object-contain", logo.dark && "dark:hidden")} />
          {logo.dark ? (
            <Image src={logo.dark} alt="" width={16} height={16} className={cn(size, "hidden object-contain dark:block")} />
          ) : null}
        </>
      );
    }
  }
}

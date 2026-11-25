import Link from "next/link";
import { ArrowRight, BookOpen, Braces, Download, Plug, Search, Terminal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIBRARY_STATS, SHOWCASE_PACKS } from "@/content/emoji-showcase";
import { SITE_ORIGIN } from "@/content/site";
import {
  EMOJI_API_DOCS_PATH,
  EMOJI_EXPORT_PATH,
  EMOJI_GUIDE_PATH,
  EMOJI_LIBRARY_PATH,
  EMOJI_MCP_PATH,
  emojiPackPath,
} from "@/lib/emoji-links";
import { EmojiGlyph } from "./emoji-glyph";
import { DuckIcon } from "./duck-icon";
import { EmojiMarquee } from "./emoji-marquee";
import { CopyButton } from "./install-window";
import { Container } from "./section";

const fmt = new Intl.NumberFormat("en-US");

type Way = { icon: LucideIcon; name: string; who: string; code: string; href?: string; tools?: string[] };

// Every endpoint and tool below is served by this site (src/app/api, src/lib/emoji-mcp.ts) and
// documented on /emoji/api-docs; the skill command is from the skill README (3.3.0).
const WAYS: Way[] = [
  {
    icon: Search,
    name: "Browse the catalog",
    who: "People: search by meaning in three languages, filter by tags, preview animations, copy ids.",
    code: `${SITE_ORIGIN}${EMOJI_LIBRARY_PATH}`,
    href: EMOJI_LIBRARY_PATH,
  },
  {
    icon: Braces,
    name: "Public JSON API",
    who: "Scripts: search, read a pack, find the pack behind a custom emoji id. No key, plain GET requests.",
    code: `curl "${SITE_ORIGIN}/api/emoji-search?q=checkmark"`,
    href: `${EMOJI_API_DOCS_PATH}#endpoints`,
  },
  {
    icon: Plug,
    name: "Remote MCP server",
    who: "Agents: read-only, stateless, no sign-in. Works as a claude.ai custom connector too.",
    code: `claude mcp add --transport http telegram-emoji ${SITE_ORIGIN}${EMOJI_MCP_PATH}`,
    href: `${EMOJI_API_DOCS_PATH}#mcp`,
    tools: ["emoji_search", "emoji_pack", "emoji_by_id", "emoji_facets", "emoji_rank_packs", "emoji_pick_family"],
  },
  {
    icon: Terminal,
    name: "Inside the skill",
    who: "Your coding agent: one pack that covers the bot’s icon slots, ranked by coverage and tags.",
    code: "py -3 scripts/tgui.py emoji library pick --needs home,back,settings",
  },
  {
    icon: Download,
    name: "Offline export",
    who: "CI and air-gapped runs: the whole catalog with tags in one gzip file; Studio and the skill read it.",
    code: `curl -O ${SITE_ORIGIN}${EMOJI_EXPORT_PATH}`,
    href: EMOJI_EXPORT_PATH,
  },
];

export function EmojiLibrary() {
  const stats = [
    { value: fmt.format(LIBRARY_STATS.packs), label: "premium emoji packs" },
    { value: fmt.format(LIBRARY_STATS.emoji), label: "custom emoji with real ids" },
    { value: String(LIBRARY_STATS.facets.length), label: "tag facets per pack" },
    { value: "3", label: "search languages: en, ru, uk" },
  ];

  return (
    <section id="emoji-library" aria-labelledby="emoji-library-heading" className="py-16 sm:py-20">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-brand">
              <DuckIcon name="library" className="size-7" />
              Telegram Emoji Library
            </p>
            <h2 id="emoji-library-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Every premium emoji your bot needs, with the id it needs.
            </h2>
            <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
              A free, open catalog of Telegram custom emoji packs. Each pack is tagged by style, colour, theme fit and
              motion, so a person, a script or a coding agent can pick one family for the whole bot, not a random mix.
            </p>
          </div>
          <Button asChild size="lg" className="h-11 shrink-0 self-start px-5 md:self-auto">
            <Link href={EMOJI_LIBRARY_PATH}>
              Open the library
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
        </div>

        <div className="mt-10">
          <EmojiMarquee />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-5 py-4">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{s.value}</dd>
              <dd className="mt-1 text-sm text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-16 text-xl font-semibold tracking-tight">One family per bot, chosen by tags</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Every pack carries tags for {LIBRARY_STATS.facets.join(", ").toLowerCase()}, each with a confidence.
          Each pack also says what it is for and what it is not for.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHOWCASE_PACKS.map((pack) => (
            <li key={pack.name} className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand/40">
              <div className="grid grid-cols-6 gap-1.5">
                {pack.sample.map((emoji) => (
                  <span key={emoji.id} className="flex aspect-square items-center justify-center rounded-lg bg-muted/60">
                    <EmojiGlyph emoji={emoji} className="size-[70%]" />
                  </span>
                ))}
              </div>
              <h4 className="mt-4 font-semibold">
                <Link href={emojiPackPath(pack.name)} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
                  {pack.title}
                </Link>
              </h4>
              <p className="text-xs text-muted-foreground">
                t.me/addemoji/{pack.name} · {pack.count} emoji
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{pack.what}</p>
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-4" aria-label="Tags">
                {pack.tags.map((tag) => (
                  <li key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <h3 className="mt-16 text-xl font-semibold tracking-tight">Five ways in, one catalog</h3>
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">How to use the emoji library</caption>
            <thead className="hidden bg-muted text-muted-foreground md:table-header-group">
              <tr>
                <th scope="col" className="w-1/5 px-5 py-3 font-medium">Way in</th>
                <th scope="col" className="w-1/3 px-5 py-3 font-medium">For whom</th>
                <th scope="col" className="px-5 py-3 font-medium">Try it</th>
              </tr>
            </thead>
            <tbody>
              {WAYS.map((way) => (
                <tr key={way.name} className="block border-t border-border first:border-t-0 md:table-row">
                  <th scope="row" className="block px-5 pt-4 font-semibold md:table-cell md:py-4 md:align-top">
                    <span className="flex items-center gap-2">
                      <way.icon aria-hidden="true" className="size-4 text-brand" />
                      {way.href ? (
                        <Link href={way.href} className="hover:underline">
                          {way.name}
                        </Link>
                      ) : (
                        way.name
                      )}
                    </span>
                  </th>
                  <td className="block px-5 pt-2 text-muted-foreground md:table-cell md:py-4 md:align-top">
                    <span className="sr-only md:hidden">For whom: </span>
                    {way.who}
                    {way.tools ? (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {way.tools.map((tool) => (
                          <code key={tool} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                            {tool}
                          </code>
                        ))}
                      </span>
                    ) : null}
                  </td>
                  <td className="block px-5 pt-2 pb-4 md:table-cell md:py-4 md:align-top">
                    <span className="sr-only md:hidden">Try it: </span>
                    <div className="flex items-start gap-2 rounded-lg border border-border bg-background py-1.5 pr-1.5 pl-3">
                      <code className="min-w-0 flex-1 py-1 font-mono text-xs leading-5 [overflow-wrap:anywhere]">{way.code}</code>
                      <CopyButton text={way.code} label={way.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Link href={EMOJI_GUIDE_PATH} className="inline-flex items-center gap-2 font-medium text-brand hover:underline">
            <BookOpen aria-hidden="true" className="size-4" />
            Custom emoji in buttons and messages: the guide
          </Link>
          <Link href={EMOJI_API_DOCS_PATH} className="inline-flex items-center gap-2 font-medium text-brand hover:underline">
            API and MCP reference <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <p className="text-muted-foreground">Custom emoji need a Fragment username for the bot, or owner Premium for private chats and groups.</p>
        </div>
      </Container>
    </section>
  );
}

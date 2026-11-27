// The landing as Markdown, for agents and answer engines: the same facts as the HTML page at a fraction of its
// weight. Served at /index.md and for "/" when the client asks for text/markdown first (src/proxy.ts).
import { BOT_API, FAQ, INSTALL_GUIDES, REPO_URL, SITE_DESCRIPTION, SITE_ORIGIN, SITE_TITLE, VERIFIED_ON, VERSION } from "@/content/site";

export function GET() {
  const o = SITE_ORIGIN;
  const install = INSTALL_GUIDES.flatMap((g) => [
    `### ${g.title}`,
    "",
    g.note,
    "",
    ...g.steps.map((s) => `- ${s.label}: \`${s.command}\``),
    `- ${g.update.label}: \`${g.update.command}\``,
    ...(g.alt ? [`- ${g.alt.label}: \`${g.alt.command}\` (${g.alt.note})`] : []),
    "",
  ]);
  const body = [
    `# ${SITE_TITLE}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    `Version ${VERSION}, Telegram Bot API ${BOT_API}, verified ${VERIFIED_ON}. MIT licensed, free. Source: ${REPO_URL}`,
    "",
    "## What it is",
    "",
    "An open-source Agent Skill that teaches a coding agent (Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and others) to design, audit, build and operate everything a Telegram bot shows, sends and reacts to: screens, keyboards, menus, forms, streaming AI replies with Stop, HTML widgets, Mini Apps, Rich Messages, premium emoji, Stars payments, channel posts and mailings. It ships offline catalogs of the whole Bot API and Telegram.WebApp, bot-ui Studio (a local screen map and Telegram simulator), an MCP server, and a free premium emoji library.",
    "",
    "## Install",
    "",
    `The fastest way: ask your agent to "Install the telegram-bot-ui skill following ${o}/agents.md". Or run one of these:`,
    "",
    ...install,
    "## Free tools on this site",
    "",
    `- [Telegram premium emoji library](${o}/emoji): search packs by name, meaning or emoji; copy custom emoji IDs, message HTML and bot button icons. Also in [Russian](${o}/emoji/ru) and [Ukrainian](${o}/emoji/uk).`,
    `- [Emoji mosaic maker](${o}/emoji/mosaic): turn a picture, GIF or video into a Telegram premium emoji pack that rebuilds it in one message. Also in [Russian](${o}/emoji/ru/mosaic) and [Ukrainian](${o}/emoji/uk/mosaic).`,
    `- [Custom emoji guide](${o}/emoji/custom-emoji-guide) and [JSON API, ID lookup and MCP server](${o}/emoji/api-docs) ([OpenAPI](${o}/api/emoji-openapi.json), MCP at ${o}/api/mcp).`,
    `- [bot-ui Studio](${o}/studio): map a bot's screens and test its flows.`,
    "",
    "## Questions",
    "",
    ...FAQ.flatMap((item) => [`### ${item.q}`, "", item.a, ""]),
    "## More for agents",
    "",
    `- [agents.md](${o}/agents.md): install per host, verify, commands, project memory, safety`,
    `- [llms.txt](${o}/llms.txt) and [llms-full.txt](${o}/llms-full.txt): everything in one file`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}

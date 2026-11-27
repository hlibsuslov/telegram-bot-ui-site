import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BOT_API, REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE, VERIFIED_ON, VERSION } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// No preload: a preloaded font makes every page answer with Next's own Link header, which replaces the homepage's
// RFC 8288 Link to llms.txt, the Markdown version and the API catalog (next.config.ts). display: swap keeps text
// visible while the fonts arrive.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Telegram bot",
    "Telegram Bot API",
    "bot UI",
    "bot UX",
    "Agent Skills",
    "Claude Code",
    "Codex",
    "Cursor",
    "inline keyboard",
    "HTML widgets",
    "Telegram Mini Apps",
    "Telegram premium emoji",
    "custom emoji packs",
    "MCP server",
    "Telegram Stars payments",
    "Rich Messages",
  ],
  authors: [{ name: "hlibsuslov", url: "https://github.com/hlibsuslov" }],
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b111c" },
  ],
  colorScheme: "light dark",
};

// One linked graph, so answer engines can tell what the site is, who makes it, what the code is and how to get it.
const AUTHOR_ID = "https://github.com/hlibsuslov#person";
const ORG_ID = `${SITE_ORIGIN}/#org`;
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: ["en", "ru", "uk"],
      publisher: { "@id": ORG_ID },
    },
    {
      // The project as the entity: the same name as the title's prefix and og:site_name.
      "@type": "Organization",
      "@id": ORG_ID,
      name: SITE_NAME,
      url: `${SITE_ORIGIN}/`,
      logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/icon.png`, width: 192, height: 192 },
      description: SITE_DESCRIPTION,
      founder: { "@id": AUTHOR_ID },
      sameAs: [REPO_URL, "https://github.com/hlibsuslov"],
    },
    {
      "@type": "Person",
      "@id": AUTHOR_ID,
      name: "Hlib Suslov",
      alternateName: "hlibsuslov",
      url: "https://github.com/hlibsuslov",
      sameAs: ["https://github.com/hlibsuslov", REPO_URL],
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_ORIGIN}/#code`,
      name: "telegram-bot-ui",
      description: SITE_DESCRIPTION,
      codeRepository: REPO_URL,
      license: "https://opensource.org/licenses/MIT",
      programmingLanguage: ["Python", "TypeScript"],
      keywords: "Telegram bot UI, Telegram Mini Apps, premium emoji, MCP server, Agent Skills, Bot API",
      version: VERSION,
      dateModified: VERIFIED_ON,
      author: { "@id": AUTHOR_ID },
      targetProduct: { "@id": `${SITE_ORIGIN}/#app` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#app`,
      name: "telegram-bot-ui Agent Skill",
      alternateName: "Telegram Bot UI",
      url: SITE_ORIGIN,
      description: SITE_DESCRIPTION,
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Agent Skill for coding agents",
      operatingSystem: "Windows, macOS, Linux",
      softwareRequirements: "A coding agent that loads Agent Skills: Claude Code, Codex, Cursor, GitHub Copilot, Gemini CLI and others",
      softwareVersion: VERSION,
      dateModified: VERIFIED_ON,
      downloadUrl: REPO_URL,
      installUrl: `${SITE_ORIGIN}/agents.md`,
      license: "https://opensource.org/licenses/MIT",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@id": AUTHOR_ID },
      featureList: [
        `Telegram Bot API ${BOT_API} catalog, offline`,
        "Bot screens, keyboards, menus and forms",
        "Streaming AI replies with Stop",
        "Mini Apps and HTML widgets",
        "Premium emoji library with an MCP server and a JSON API",
        "Emoji mosaics from a picture or video",
        "Stars payments, channel posts and mailings",
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        {/* Static string from lib/theme; sets the theme class before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Plain-text versions for agents and answer engines: a fraction of this page's weight, the same facts. */}
        <link rel="alternate" type="text/markdown" href="/index.md" title="Telegram Bot UI in Markdown" />
        <link rel="alternate" type="text/markdown" href="/agents.md" title="Install and use it: guide for agents" />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
        <link rel="alternate" type="text/plain" href="/llms-full.txt" title="llms-full.txt: everything in one file" />
      </head>
      <body className="min-h-dvh">
        <script
          type="application/ld+json"
          // Static object defined above; no user input reaches it.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

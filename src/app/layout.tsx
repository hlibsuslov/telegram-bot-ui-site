import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, VERSION } from "@/content/site";
import { siteUrl } from "@/lib/site-url";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "telegram-bot-ui",
  description: SITE_DESCRIPTION,
  codeRepository: REPO_URL,
  license: "https://opensource.org/licenses/MIT",
  programmingLanguage: ["Python", "TypeScript"],
  version: VERSION,
  author: { "@type": "Person", name: "hlibsuslov", url: "https://github.com/hlibsuslov" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <head>
        {/* Static string from lib/theme; sets the theme class before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <script
          type="application/ld+json"
          // Static object defined above; no user input reaches it.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}

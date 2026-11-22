# telegram-bot-ui-site

Landing page for [telegram-bot-ui](https://github.com/hlibsuslov/telegram-bot-ui), an open-source Agent Skill for Telegram bot UI and UX.

Next.js (App Router) + Tailwind CSS + shadcn/ui. Sections are adapted from 21st.dev blocks; the chat mock-ups are hand-drawn SVG in `src/components/chat/`.

```bash
npm install
npm run dev
```

```bash
npm run lint && npm run build
```

## Content

- Every claim comes from the skill repository. Facts, install commands and FAQ live in `src/content/site.ts`; update it with each skill release.
- Demo video: web copies in `public/video/` (58 s, 1280x720 H.264 MP4 with faststart and VP9 WebM, ~4.4 MB and ~3.5 MB; v2 with real bot-ui Studio footage), wired up in `DEMO_VIDEO` in `src/content/site.ts`. It loads only when played, autoplays muted while in view and never autoplays with reduced motion.
- The GitHub star count is fetched at build time and refreshed hourly.
- `NEXT_PUBLIC_SITE_URL` overrides the canonical URL; on Vercel it defaults to the production domain.

## License

MIT

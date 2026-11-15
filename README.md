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
- Demo video: put the files in `public/` and fill `DEMO_VIDEO.src` and `DEMO_VIDEO.poster` in `src/content/site.ts`. The block stays hidden while `src` is empty.
- The GitHub star count is fetched at build time and refreshed hourly.
- `NEXT_PUBLIC_SITE_URL` overrides the canonical URL; on Vercel it defaults to the production domain.

## License

MIT

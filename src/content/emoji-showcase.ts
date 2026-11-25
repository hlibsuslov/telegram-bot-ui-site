// Real custom emoji from the library, drawn as static SVG. Each file is one frame of the pack's
// Lottie animation (TGS), rendered with lottie-web's SVG renderer from the production pack data on
// 2026-11-25. Adaptive emoji, which Telegram repaints in the text colour, are stored black and
// inverted on the dark theme. Pack facts and descriptions come from /emoji-library.ndjson.gz.

export type PreviewEmoji = { pack: string; id: string; fallback: string; adaptive?: boolean };

export function previewSrc(e: Pick<PreviewEmoji, "pack" | "id">) {
  return `/emoji-previews/${e.pack}-${e.id}.svg`;
}

export const LIBRARY_STATS = {
  packs: 479,
  emoji: 47301,
  facets: ["Style", "Colour", "Palette", "Theme fit", "Motion", "Topic", "Mood", "Interface role", "Bot category"],
  languages: "English, Russian and Ukrainian",
  checked: "2026-11-25",
} as const;

const ios = (id: string, fallback: string): PreviewEmoji => ({ pack: "tgiosicons", id, fallback, adaptive: true });
const hearts = (id: string): PreviewEmoji => ({ pack: "AdaptiveHearts", id, fallback: "❤️", adaptive: true });
const of = (pack: string) => (id: string, fallback: string): PreviewEmoji => ({ pack, id, fallback });
const duck = of("DuckEmoji");
const flame = of("FlameEmoji");
const premium = of("TgPremiumIcons");
const news = of("NewsEmoji");
const merchant = of("MerchantsPay");

export const EMOJI = {
  settings: ios("5904258298764334001", "⚙️"),
  gift: ios("5773677501825945508", "🎁"),
  favorite: ios("6028338546736107668", "⭐️"),
  share: ios("6028346797368283073", "✈️"),
  screen: ios("5942734685976138521", "🖥"),
  filters: ios("5776424837786374634", "🎛"),
  done: merchant("5377674855640508021", "✅"),
  refresh: merchant("5375606777347875750", "🔄"),
  send: merchant("5377739559322821721", "📨"),
  route: merchant("5377689969630424717", "🧭"),
  star: merchant("5375476253291751195", "⭐️"),
  swap: merchant("5375190513412517059", "↔️"),
  stop: news("5260293700088511294", "⛔️"),
  alert: news("5274099962655816924", "❗️"),
  shop: news("5229064374403998351", "🛍"),
  flash: news("5456140674028019486", "⚡️"),
  eyes: news("5210956306952758910", "👀"),
  ban: news("5240241223632954241", "🚫"),
  premiumStar: premium("5848021027782661221", "🌟"),
  mic: premium("5789408596936626626", "🎙"),
  bolt: premium("5789716881099199246", "⚡️"),
  film: premium("5789926071776317562", "🎞"),
  goldStar: premium("5897658922600240288", "⭐️"),
  goldStars: premium("5920281855378068765", "⭐️"),
} as const;

/** Two rows that drift across the library section; a mix of styles on purpose. */
export const MARQUEE: PreviewEmoji[][] = [
  [
    duck("5366316836101038579", "😄"), EMOJI.settings, flame("5355198673305216688", "😍"), EMOJI.premiumStar, news("5461117441612462242", "🙂"),
    hearts("5433797687218554972"), EMOJI.done, duck("5395689060876426750", "😇"), EMOJI.gift, EMOJI.mic, flame("5352953358892149485", "😇"),
    EMOJI.stop, duck("5364029976469315203", "😂"), EMOJI.share, EMOJI.goldStars, hearts("5433986803218531614"), EMOJI.eyes,
  ],
  [
    EMOJI.refresh, duck("5384068292417690842", "😁"), EMOJI.filters, EMOJI.bolt, flame("5282999122008221435", "🥰"), EMOJI.alert,
    hearts("5433779558161600844"), EMOJI.favorite, duck("5415816441561619011", "😅"), EMOJI.shop, EMOJI.route, EMOJI.film,
    flame("5431895781210598149", "😊"), EMOJI.screen, duck("5364102539941780695", "😉"), EMOJI.flash, hearts("5433978677140411219"),
  ],
];

export type ShowcasePack = {
  name: string;
  title: string;
  count: number;
  tags: string[];
  what: string;
  sample: PreviewEmoji[];
};

/** Four packs with the tags and the one-line description the library gives them. */
export const SHOWCASE_PACKS: ShowcasePack[] = [
  {
    name: "tgiosicons",
    title: "Telegram iOS Icons",
    count: 200,
    tags: ["native UI", "outline", "adaptive", "settings"],
    what: "Thin line icons from the Telegram iOS interface that take the text colour.",
    sample: [EMOJI.settings, EMOJI.gift, EMOJI.favorite, EMOJI.share, EMOJI.screen, EMOJI.filters],
  },
  {
    name: "TgPremiumIcons",
    title: "Telegram Premium",
    count: 119,
    tags: ["gradient", "native UI", "multicolour", "action"],
    what: "Premium feature icons: glyphs on gradient tiles and gold stars.",
    sample: [EMOJI.mic, EMOJI.bolt, EMOJI.film, EMOJI.premiumStar, EMOJI.goldStar, EMOJI.goldStars],
  },
  {
    name: "NewsEmoji",
    title: "News Emoji",
    count: 100,
    tags: ["glossy", "status", "vivid", "both themes"],
    what: "Glossy sticker-like signs for news markers, shop labels and status lines.",
    sample: [EMOJI.alert, EMOJI.stop, EMOJI.ban, EMOJI.shop, EMOJI.flash, EMOJI.eyes],
  },
  {
    name: "DuckEmoji",
    title: "Duck Emoji",
    count: 104,
    tags: ["cartoon", "faces", "yellow", "community"],
    what: "Yellow duck heads that copy standard emoji faces, for friendly community bots.",
    sample: [
      duck("5366316836101038579", "😄"), duck("5384068292417690842", "😁"), duck("5395689060876426750", "😇"),
      duck("5364029976469315203", "😂"), duck("5415816441561619011", "😅"), duck("5364102539941780695", "😉"),
    ],
  },
];

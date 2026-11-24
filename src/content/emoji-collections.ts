// Hand-picked rows on the first screen of /emoji. Each pack appears in one row only, so the rows
// do not repeat each other. Picked from contact sheets for clean drawing and a consistent set;
// a pack the resolver cannot read is skipped. Names must also be listed in emoji-packs.txt.

export const CURATED_COLLECTIONS = {
  "bot-ui": [
    "tgiosicons", "NewsEmoji", "MerchantsPay", "pulsar_pulse_by_PulsarMarketBot", "BasicinterfaceEmoji",
    "DMJUnigramAnimationEmoji", "TgPremiumIcons", "tgmacicons", "projpack_emoji", "Topics", "InterfaceElements",
  ],
  popular: [
    "FluentEmojiSet1", "TwemojiSmileys", "logoskirnel", "BrandsPack", "CryptoIcons", "FlagOfWorld",
    "ABCEmoji", "TwemojiFoods", "PepeEmoji", "NyankoEmoji", "BirthdayCollection", "ChristmasEmoji",
  ],
  animated: [
    "MadEmoji", "DuckEmoji", "Catz5Emoji", "FlameEmoji", "SparklesEmoji", "EffectEmoji",
    "MemeEmoji", "DogeEmoji", "PandaEmoji", "FaceEmoji", "AnimatedReactions", "HandEmoji",
  ],
  adaptive: [
    "ninecandles", "TgAndroidIcons", "OutlineEmoji", "AdaptiveHearts", "AnimatedReactionsAdaptive", "ChristmasIcons",
    "AdaptivePixelEmoji", "FinanceAnimations", "AdaptiveAnimals", "checkified", "EmoticonEmoji", "magiccult_adaptiveEmoji",
  ],
} as const;

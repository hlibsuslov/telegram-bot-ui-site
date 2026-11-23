// Icons for the library's list, in the style of Telegram's settings: a white glyph on a coloured
// rounded square. Each category and collection has its own; unknown categories get a folder.
import {
  BadgeCheck, Bitcoin, Bookmark, Bot, CloudSun, Drama, Flag, Flame, Folder, Gamepad2, Heart, LayoutGrid, PartyPopper,
  PawPrint, Play, Shapes, Smile, Sparkles, Store, SunMoon, Type, UtensilsCrossed, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, [LucideIcon, string]> = {
  // library
  "all": [Shapes, "#3390ec"],
  "saved": [Bookmark, "#ff9500"],
  // collections
  "bot-ui": [Bot, "#3390ec"],
  "popular": [Flame, "#ff6a00"],
  "animated": [Play, "#2fb14a"],
  "adaptive": [SunMoon, "#636366"],
  // categories
  "Interface & icons": [LayoutGrid, "#3390ec"],
  "Status & signs": [BadgeCheck, "#2fb14a"],
  "Brands & logos": [Store, "#f08a00"],
  "Crypto & finance": [Bitcoin, "#d98e04"],
  "Letters & fonts": [Type, "#5856d6"],
  "Faces & emotions": [Smile, "#e0a100"],
  "Memes & characters": [Drama, "#af52de"],
  "Animals": [PawPrint, "#a2845e"],
  "Food & drink": [UtensilsCrossed, "#ff3b30"],
  "Nature & weather": [CloudSun, "#1ea7e1"],
  "Holidays & seasons": [PartyPopper, "#ff2d55"],
  "Hearts & love": [Heart, "#e63e62"],
  "Flags & places": [Flag, "#24a8bf"],
  "Games & pixel art": [Gamepad2, "#5e5ce6"],
  "Effects & decor": [Sparkles, "#bf5af2"],
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const [Icon, color] = ICONS[name] ?? [Folder, "#8e8e93"];
  return (
    <span aria-hidden="true" className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-white", className)} style={{ background: color }}>
      <Icon className="size-[17px]" strokeWidth={2.2} />
    </span>
  );
}

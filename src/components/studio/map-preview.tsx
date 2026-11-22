import { getImageProps } from "next/image";
import Link from "next/link";
import { DEMO_BOT_NAME } from "@/content/studio";

const ALT = `${DEMO_BOT_NAME}’s bot map in Studio, with Telegram messages, buttons and arrows between screens`;

export function StudioMapPreview({ href, eager = false }: { href: string; eager?: boolean }) {
  const { props: { alt, ...props } } = getImageProps({
    src: "/studio/map-desktop.webp",
    alt: ALT,
    width: 1440,
    height: 700,
    unoptimized: true,
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : undefined,
  });

  return (
    <Link
      href={href}
      aria-label={`Open the live ${DEMO_BOT_NAME} bot map`}
      className="block overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-[border-color,box-shadow] hover:border-brand/60 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:rounded-2xl"
    >
      <picture>
        <source media="(max-width: 639px)" srcSet="/studio/map-mobile.webp" width={390} height={420} />
        <img {...props} alt={alt} className="block h-auto w-full" />
      </picture>
    </Link>
  );
}

import { MosaicLanding, mosaicMetadata } from "@/components/emoji/mosaic-landing";

export const metadata = mosaicMetadata("en");

export default function EmojiMosaicPage() {
  return <MosaicLanding locale="en" />;
}

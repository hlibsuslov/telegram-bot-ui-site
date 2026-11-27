import { LibraryLanding, libraryMetadata } from "@/components/emoji/library-landing";

export const metadata = libraryMetadata("uk");

export default async function EmojiLibraryPageUK() {
  return <LibraryLanding locale="uk" />;
}

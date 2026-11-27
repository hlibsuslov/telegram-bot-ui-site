import { LibraryLanding, libraryMetadata } from "@/components/emoji/library-landing";

export const metadata = libraryMetadata("ru");

export default async function EmojiLibraryPageRU() {
  return <LibraryLanding locale="ru" />;
}

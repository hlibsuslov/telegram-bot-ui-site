import { LibraryLanding, libraryMetadata } from "@/components/emoji/library-landing";

export const metadata = libraryMetadata("en");

export default async function EmojiLibraryPage() {
  return <LibraryLanding locale="en" />;
}

import Link from "next/link";

export default function PackNotFound() {
  return (
    <section className="tg-glass rounded-3xl p-6">
      <h1 className="text-xl font-semibold">Emoji pack not found</h1>
      <p className="tg-hint mt-2 text-sm">Browse the library to find a public Telegram emoji pack.</p>
      <Link href="/emoji" className="tg-accent mt-3 inline-block underline">Back to Emoji Library</Link>
    </section>
  );
}

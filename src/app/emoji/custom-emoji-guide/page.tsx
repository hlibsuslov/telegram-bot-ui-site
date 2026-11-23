import Link from "next/link";
import { CopyRow } from "@/components/emoji/copy-row";
import { EmojiCode, EmojiDoc } from "@/components/emoji/emoji-doc";
import { JsonLd } from "@/components/emoji/json-ld";
import { CHECKMARK } from "@/content/emoji-example";
import { EMOJI_API_DOCS_PATH, EMOJI_GUIDE_PATH } from "@/lib/emoji-links";
import { emojiBreadcrumbs, emojiMetadata } from "@/lib/emoji-metadata";
import { buttonEmojiField, messageEmojiHtml } from "@/lib/emoji-snippets";

const TITLE = "Add custom emoji to Telegram bot buttons and messages";
const DESCRIPTION = "Find an animated checkmark in a real Telegram pack and use its custom emoji ID in an inline keyboard or a sendMessage HTML payload.";

export const metadata = emojiMetadata(EMOJI_GUIDE_PATH, TITLE, DESCRIPTION, "article");

const html = messageEmojiHtml(CHECKMARK.id, CHECKMARK.fallback);

export default function CustomEmojiGuide() {
  return (
    <EmojiDoc title={TITLE} intro={DESCRIPTION}>
      <JsonLd value={emojiBreadcrumbs({ name: "Emoji Library", path: "/emoji" }, { name: TITLE, path: EMOJI_GUIDE_PATH })} />
      <section>
        <h2>Find an animated checkmark</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Open the <Link href="/emoji">Telegram Emoji Library</Link> and search for <code>checkified checkmark</code>.</li>
          <li>Open the animated ✅ result from <Link href={CHECKMARK.path}>{CHECKMARK.title}</Link>. It is a TGS emoji that takes the text color.</li>
          <li>Copy the custom emoji ID, message HTML, button field, or source link from the selected emoji.</li>
        </ol>
        <p className="mt-3">Keep the ID in quotes in JSON and JavaScript to preserve every digit.</p>
      </section>
      <section aria-labelledby="button">
        <h2 id="button">Put the checkmark on a button</h2>
        <p>Use <code>icon_custom_emoji_id</code> on an <a href="https://core.telegram.org/bots/api#inlinekeyboardbutton">InlineKeyboardButton</a>. Send this JSON body to <code>sendMessage</code> with your chat ID. Handle <code>confirm</code> in your bot’s callback handler.</p>
        <EmojiCode>{JSON.stringify({
          chat_id: "YOUR_CHAT_ID",
          text: "Ready to confirm?",
          reply_markup: { inline_keyboard: [[{ text: "Confirm", callback_data: "confirm", icon_custom_emoji_id: CHECKMARK.id }]] },
        }, null, 2)}</EmojiCode>
        <CopyRow label="Button field" accessibleLabel="icon_custom_emoji_id button field" value={buttonEmojiField(CHECKMARK.id)} />
      </section>
      <section aria-labelledby="message">
        <h2 id="message">Put the checkmark in a message</h2>
        <p>Use <code>{'parse_mode: "HTML"'}</code> and wrap the fallback emoji in <a href="https://core.telegram.org/bots/api#html-style"><code>&lt;tg-emoji&gt;</code></a>. If you build entities directly, set <code>{'type: "custom_emoji"'}</code> and <code>custom_emoji_id</code> on the message entity. Entity offsets and lengths use UTF-16 code units.</p>
        <EmojiCode>{JSON.stringify({ chat_id: "YOUR_CHAT_ID", parse_mode: "HTML", text: `${html} Confirmed` }, null, 2)}</EmojiCode>
        <CopyRow label="Telegram message HTML" value={html} />
      </section>
      <section>
        <h2>Check whether your bot can send it</h2>
        <p>Telegram allows bots with additional usernames purchased on Fragment to use custom emoji. A bot whose owner has Telegram Premium can also use them in messages it sends directly to private chats, groups, and supergroups. For channel posts, use the Fragment route. Keep a readable button label and check the returned message for the custom emoji entity or button icon.</p>
        <p className="mt-3">Pack, ID, and fallback verified on November 23, 2026. The payloads follow the <a href="https://core.telegram.org/bots/api#sendmessage">Telegram Bot API</a>.</p>
      </section>
      <nav aria-label="Related tools" className="flex flex-wrap gap-x-5 gap-y-2">
        <Link href={CHECKMARK.path}>Checkmark source pack</Link>
        <Link href={`${EMOJI_API_DOCS_PATH}#lookup`}>Find a pack by ID</Link>
        <Link href="/studio">Try bot-ui Studio</Link>
      </nav>
    </EmojiDoc>
  );
}

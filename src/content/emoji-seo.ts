// Search and answer-engine copy for the emoji pages, in the languages people search in: English, Russian and
// Ukrainian. The phrases follow real queries ("картинка из эмодзи", "разбить картинку на эмодзи", "image to Telegram
// emoji", "emoji pack from a video"). Every claim matches what the tools do; keep it that way when editing.
import { EMOJI_LIBRARY_PATH, EMOJI_MOSAIC_PATH } from "@/lib/emoji-links";

export type Locale = "en" | "ru" | "uk";
export const LOCALES: Locale[] = ["en", "ru", "uk"];
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", ru: "Русский", uk: "Українська" };
export const OG_LOCALE: Record<Locale, string> = { en: "en_US", ru: "ru_RU", uk: "uk_UA" };

/** /emoji/mosaic, /emoji/ru/mosaic, /emoji/uk/mosaic; /emoji, /emoji/ru, /emoji/uk. */
export function mosaicPath(locale: Locale): string {
  return locale === "en" ? EMOJI_MOSAIC_PATH : `${EMOJI_LIBRARY_PATH}/${locale}/mosaic`;
}
export function libraryPath(locale: Locale): string {
  return locale === "en" ? EMOJI_LIBRARY_PATH : `${EMOJI_LIBRARY_PATH}/${locale}`;
}

export type Faq = { q: string; a: string };
export type PageCopy = {
  title: string;
  description: string;
  h1: string;
  lead: string;
  howToTitle?: string;
  steps?: { name: string; text: string }[];
  faqTitle: string;
  faq: Faq[];
  keywords: string[];
};

export const MOSAIC_COPY: Record<Locale, PageCopy & { drop: string; dropHint: string; appName: string }> = {
  en: {
    title: "Image to Telegram Premium Emoji: Free Emoji Mosaic Maker",
    description:
      "Split a picture, GIF or video into Telegram premium emoji and get an emoji pack that rebuilds the image in one message. Free, in your browser, up to 100 emoji, animated tiles in sync.",
    h1: "Turn a picture or video into Telegram premium emoji",
    lead: "Cut a photo, GIF or clip into an emoji pack. Sent as one message, the emoji put the picture back together and play in step.",
    drop: "Drop a video, GIF or picture",
    dropHint: "MP4, WebM, MOV, GIF, PNG, JPEG or WebP. Tiles are cut right here in your browser.",
    appName: "Telegram Emoji Mosaic Maker",
    howToTitle: "How to make a picture out of Telegram emoji",
    steps: [
      { name: "Open your file", text: "Drop a photo, a GIF or a video into the maker. Nothing is uploaded: the file is read in your browser." },
      { name: "Pick the grid", text: "Choose how many emoji wide and tall the picture is. The maker suggests a grid that fits the shape and stays whole on every phone, up to 8 columns and 100 emoji." },
      { name: "Frame it", text: "Drag the frame over the part you want. For a video, pick up to 3 seconds on the timeline; rounded corners and an outline are optional." },
      { name: "Create the pack", text: "Log in with Telegram and press Create pack. The bot makes the emoji pack under your account and sends you the picture as one message." },
      { name: "Post it", text: "Copy that message into a chat or a channel post on its own, without other text, so Telegram shows it as big emoji." },
    ],
    faqTitle: "Questions about emoji mosaics",
    faq: [
      { q: "How do I split a picture into Telegram emoji?", a: "Open the picture in the emoji mosaic maker, pick a grid (for example 7×4), and press Create pack. Each 100×100 piece becomes one custom emoji in a new pack, and the bot sends you the whole picture as one message." },
      { q: "Can I make animated emoji from a video or a GIF?", a: "Yes. Pick up to 3 seconds of the clip on the timeline; every tile becomes a WEBM video emoji at up to 30 frames per second. All tiles share the same frame rate and frame count, so they play in step." },
      { q: "Do I need Telegram Premium?", a: "Anyone can create an emoji pack. To send custom emoji in messages and posts you need Telegram Premium; people who read the message see the picture without Premium." },
      { q: "How many emoji can one picture use?", a: "Telegram shows up to 100 custom emoji in one message. The maker keeps rows to 8 emoji or fewer, because wider rows wrap on phones and the picture falls apart." },
      { q: "Why does an emoji picture sometimes look broken or shifted?", a: "If a row is wider than the message, Telegram moves the last emoji to a new line. The maker shows a small-iPhone preview and offers a grid that stays whole everywhere. Send the picture as its own message: with text next to it Telegram draws the emoji as text, and on Android the rows overlap." },
      { q: "Is it free, and is my photo uploaded?", a: "It is free and needs no sign-up to try. The picture is cut into tiles in your browser; when you create a pack, only the finished tiles go to Telegram, under your own account. You can also download the tiles as a ZIP instead." },
      { q: "What sizes does Telegram need for emoji?", a: "Each emoji is exactly 100×100 pixels: a PNG for a still picture, or a WEBM (VP9) video of up to 3 seconds and 30 FPS for an animated one. Telegram refuses video emoji over about 64 KB, so the maker keeps every tile under that." },
      { q: "Can I put the picture in a Telegram channel post?", a: "Yes. Open the message the bot sent, copy it and paste it into the channel post on its own. Your Telegram Premium lets you use the pack; subscribers see the picture." },
    ],
    keywords: ["image to telegram emoji", "picture to premium emoji", "split image into emoji", "telegram emoji pack maker", "video to telegram emoji", "gif to telegram emoji", "emoji mosaic", "custom emoji pack from photo"],
  },
  ru: {
    title: "Премиум эмодзи из картинки и видео: мозаика для Telegram",
    description:
      "Разбейте картинку, гифку или видео на премиум эмодзи и получите эмодзи-пак, который собирает изображение в одном сообщении Telegram. Бесплатно, прямо в браузере, до 100 эмодзи, анимация без рассинхрона.",
    h1: "Картинка или видео из премиум эмодзи Telegram",
    lead: "Нарежьте фото, гифку или видео на эмодзи-пак. В одном сообщении эмодзи собираются обратно в картинку и играют синхронно.",
    drop: "Перетащите видео, GIF или картинку",
    dropHint: "MP4, WebM, MOV, GIF, PNG, JPEG или WebP. Картинка режется прямо в браузере.",
    appName: "Мозаика из премиум эмодзи Telegram",
    howToTitle: "Как собрать картинку из эмодзи в Telegram",
    steps: [
      { name: "Откройте файл", text: "Перетащите фото, гифку или видео. Ничего не загружается на сервер: файл читается в вашем браузере." },
      { name: "Выберите сетку", text: "Сколько эмодзи в ширину и в высоту. Сайт сам предложит сетку под форму картинки, которая не разъезжается на телефонах: до 8 эмодзи в ряд и до 100 всего." },
      { name: "Выберите кадр", text: "Сдвиньте рамку на нужную часть. Для видео выберите до 3 секунд на дорожке; скругление углов и обводка по желанию." },
      { name: "Создайте пак", text: "Войдите через Telegram и нажмите Create pack. Бот создаст эмодзи-пак на ваш аккаунт и пришлёт картинку одним сообщением." },
      { name: "Опубликуйте", text: "Скопируйте это сообщение в чат или пост канала отдельно, без другого текста: так Telegram покажет большие эмодзи." },
    ],
    faqTitle: "Вопросы про картинки из эмодзи",
    faq: [
      { q: "Как разбить картинку на эмодзи в Telegram?", a: "Откройте картинку в мозаике, выберите сетку (например, 7×4) и нажмите Create pack. Каждый кусок 100×100 станет отдельным кастомным эмодзи в новом паке, а бот пришлёт всю картинку одним сообщением." },
      { q: "Можно сделать анимированные эмодзи из видео или гифки?", a: "Да. Выберите до 3 секунд на дорожке под видео: каждый кусок станет видео-эмодзи WEBM до 30 кадров в секунду. У всех кусков одинаковые частота и число кадров, поэтому они играют синхронно, без рассинхрона." },
      { q: "Нужен ли Telegram Premium?", a: "Создать эмодзи-пак может любой. Чтобы отправлять кастомные эмодзи в сообщениях и постах, нужен Telegram Premium; читатели видят картинку и без Premium." },
      { q: "Сколько эмодзи можно использовать на одну картинку?", a: "Telegram показывает до 100 кастомных эмодзи в одном сообщении. Сайт держит не больше 8 эмодзи в ряду: более широкие ряды на телефонах переносятся, и картинка разваливается." },
      { q: "Почему картинка из эмодзи съезжает или рассыпается?", a: "Если ряд шире сообщения, Telegram переносит последние эмодзи на новую строку. Сайт показывает превью для маленького iPhone и предлагает сетку, которая не ломается нигде. Отправляйте картинку отдельным сообщением: с текстом рядом Telegram рисует эмодзи как текст, а на Android ряды наезжают друг на друга." },
      { q: "Это бесплатно? Моё фото куда-то загружается?", a: "Бесплатно, попробовать можно без регистрации. Картинка режется в вашем браузере; при создании пака в Telegram уходят только готовые кусочки, на ваш аккаунт. Можно вместо этого скачать кусочки ZIP-архивом." },
      { q: "Какие требования у Telegram к эмодзи?", a: "Каждый эмодзи ровно 100×100 пикселей: PNG для статичной картинки или видео WEBM (VP9) до 3 секунд и 30 FPS для анимированной. Видео-эмодзи больше примерно 64 КБ Telegram не принимает, поэтому сайт держит каждый кусок меньше." },
      { q: "Как вставить картинку из эмодзи в пост канала?", a: "Откройте сообщение от бота, скопируйте его и вставьте в пост канала отдельно. Ваш Telegram Premium позволяет использовать пак, а подписчики видят картинку." },
    ],
    keywords: ["премиум эмодзи из картинки", "картинка из эмодзи телеграм", "разбить картинку на эмодзи", "нарезать картинку на эмодзи", "эмодзи пак из видео", "эмодзи из гифки", "мозаика из эмодзи", "собрать картинку из эмодзи"],
  },
  uk: {
    title: "Преміум емодзі з картинки та відео: мозаїка для Telegram",
    description:
      "Розбийте картинку, гіфку або відео на преміум емодзі й отримайте емодзі-пак, який складає зображення в одному повідомленні Telegram. Безкоштовно, прямо в браузері, до 100 емодзі, анімація без розсинхрону.",
    h1: "Картинка або відео з преміум емодзі Telegram",
    lead: "Наріжте фото, гіфку чи відео на емодзі-пак. В одному повідомленні емодзі складаються назад у картинку й грають синхронно.",
    drop: "Перетягніть відео, GIF або картинку",
    dropHint: "MP4, WebM, MOV, GIF, PNG, JPEG або WebP. Картинка ріжеться прямо в браузері.",
    appName: "Мозаїка з преміум емодзі Telegram",
    howToTitle: "Як скласти картинку з емодзі в Telegram",
    steps: [
      { name: "Відкрийте файл", text: "Перетягніть фото, гіфку або відео. Нічого не завантажується на сервер: файл читається у вашому браузері." },
      { name: "Оберіть сітку", text: "Скільки емодзі завширшки й заввишки. Сайт сам запропонує сітку під форму картинки, яка не роз'їжджається на телефонах: до 8 емодзі в ряд і до 100 загалом." },
      { name: "Оберіть кадр", text: "Посуньте рамку на потрібну частину. Для відео оберіть до 3 секунд на доріжці; заокруглення кутів і обведення за бажанням." },
      { name: "Створіть пак", text: "Увійдіть через Telegram і натисніть Create pack. Бот створить емодзі-пак на ваш акаунт і надішле картинку одним повідомленням." },
      { name: "Опублікуйте", text: "Скопіюйте це повідомлення в чат або пост каналу окремо, без іншого тексту: так Telegram покаже великі емодзі." },
    ],
    faqTitle: "Питання про картинки з емодзі",
    faq: [
      { q: "Як розбити картинку на емодзі в Telegram?", a: "Відкрийте картинку в мозаїці, оберіть сітку (наприклад, 7×4) і натисніть Create pack. Кожен шматок 100×100 стане окремим кастомним емодзі в новому паку, а бот надішле всю картинку одним повідомленням." },
      { q: "Чи можна зробити анімовані емодзі з відео або гіфки?", a: "Так. Оберіть до 3 секунд на доріжці під відео: кожен шматок стане відео-емодзі WEBM до 30 кадрів на секунду. У всіх шматків однакові частота й кількість кадрів, тож вони грають синхронно." },
      { q: "Чи потрібен Telegram Premium?", a: "Створити емодзі-пак може будь-хто. Щоб надсилати кастомні емодзі в повідомленнях і постах, потрібен Telegram Premium; читачі бачать картинку й без Premium." },
      { q: "Скільки емодзі можна використати на одну картинку?", a: "Telegram показує до 100 кастомних емодзі в одному повідомленні. Сайт тримає не більше 8 емодзі в ряду: ширші ряди на телефонах переносяться, і картинка розсипається." },
      { q: "Чому картинка з емодзі з'їжджає або розсипається?", a: "Якщо ряд ширший за повідомлення, Telegram переносить останні емодзі на новий рядок. Сайт показує прев'ю для маленького iPhone і пропонує сітку, яка не ламається ніде. Надсилайте картинку окремим повідомленням: з текстом поруч Telegram малює емодзі як текст, а на Android ряди налазять один на одного." },
      { q: "Це безкоштовно? Моє фото кудись завантажується?", a: "Безкоштовно, спробувати можна без реєстрації. Картинка ріжеться у вашому браузері; під час створення паку в Telegram ідуть лише готові шматочки, на ваш акаунт. Можна натомість завантажити шматочки ZIP-архівом." },
      { q: "Які вимоги Telegram до емодзі?", a: "Кожен емодзі рівно 100×100 пікселів: PNG для статичної картинки або відео WEBM (VP9) до 3 секунд і 30 FPS для анімованої. Відео-емодзі понад приблизно 64 КБ Telegram не приймає, тому сайт тримає кожен шматок меншим." },
      { q: "Як вставити картинку з емодзі в пост каналу?", a: "Відкрийте повідомлення від бота, скопіюйте його й вставте в пост каналу окремо. Ваш Telegram Premium дозволяє використовувати пак, а підписники бачать картинку." },
    ],
    keywords: ["преміум емодзі з картинки", "картинка з емодзі телеграм", "розбити картинку на емодзі", "емодзі пак з відео", "емодзі з гіфки", "мозаїка з емодзі"],
  },
};

export const LIBRARY_COPY: Record<Locale, PageCopy> = {
  en: {
    title: "Telegram Premium Emoji Packs: Library & Custom Emoji IDs",
    description:
      "Search Telegram premium emoji packs by name, meaning, or emoji. Add a pack in one tap, copy a custom emoji ID, message HTML, or icon_custom_emoji_id for a bot button.",
    h1: "Telegram Emoji Library",
    lead: "Premium and custom emoji packs for Telegram, searchable by name, meaning or emoji, with the IDs bots need.",
    faqTitle: "Questions about Telegram premium emoji",
    faq: [
      { q: "What are Telegram premium emoji?", a: "Custom emoji are images and animations from emoji packs that Telegram shows inline in text. Anyone can add a pack; sending them in messages and posts needs Telegram Premium, while readers see them without it." },
      { q: "How do I add an emoji pack to Telegram?", a: "Open the pack's page here and press Add in Telegram, or open its t.me/addemoji link. Telegram shows the pack and adds it in one tap." },
      { q: "How do I find a custom emoji ID?", a: "Open a pack, tap the emoji and copy its ID, or paste an ID into the lookup on the API page to find the pack it belongs to. The ID goes into a message's custom_emoji entity or a button's icon_custom_emoji_id." },
      { q: "Can a Telegram bot send premium emoji?", a: "Yes, in a bot's messages when the bot has a Fragment username, or when its owner has Telegram Premium in private chats, groups and supergroups. On inline keyboard buttons, icon_custom_emoji_id puts a custom emoji next to the text." },
      { q: "How do I make my own emoji pack from a picture?", a: "Use the emoji mosaic maker: it cuts a photo, GIF or video into 100×100 emoji and creates a pack that rebuilds the picture in one message." },
      { q: "Are the packs free?", a: "Adding a pack costs nothing. The packs belong to their authors and are served by Telegram; this library only links to them." },
    ],
    keywords: ["telegram premium emoji", "telegram emoji packs", "custom emoji id", "telegram custom emoji", "addemoji"],
  },
  ru: {
    title: "Премиум эмодзи Telegram: библиотека эмодзи-паков и ID",
    description:
      "Ищите эмодзи-паки Telegram по названию, смыслу или эмодзи. Добавьте пак в один тап, скопируйте ID кастомного эмодзи, HTML для сообщения или icon_custom_emoji_id для кнопки бота.",
    h1: "Библиотека премиум эмодзи Telegram",
    lead: "Премиум и кастомные эмодзи-паки Telegram с поиском по названию, смыслу и эмодзи, и с ID, которые нужны ботам. Интерфейс поиска на английском, но запросы можно писать по-русски.",
    faqTitle: "Вопросы про премиум эмодзи Telegram",
    faq: [
      { q: "Что такое премиум эмодзи в Telegram?", a: "Кастомные эмодзи — картинки и анимации из эмодзи-паков, которые Telegram показывает прямо в тексте. Добавить пак может любой; отправлять такие эмодзи в сообщениях и постах можно с Telegram Premium, а читатели видят их и без подписки." },
      { q: "Как добавить эмодзи-пак в Telegram?", a: "Откройте страницу пака и нажмите Add in Telegram или ссылку t.me/addemoji. Telegram покажет пак и добавит его в один тап." },
      { q: "Как узнать ID кастомного эмодзи?", a: "Откройте пак, нажмите на эмодзи и скопируйте его ID, или вставьте ID в поиск на странице API, чтобы найти, из какого он пака. ID подставляется в сущность custom_emoji сообщения или в icon_custom_emoji_id кнопки." },
      { q: "Может ли бот отправлять премиум эмодзи?", a: "Да: в сообщениях, если у бота есть юзернейм с Fragment или если у владельца бота Telegram Premium — в личных чатах, группах и супергруппах. На кнопках инлайн-клавиатуры icon_custom_emoji_id ставит кастомный эмодзи рядом с текстом." },
      { q: "Как сделать свой эмодзи-пак из картинки?", a: "В мозаике из эмодзи: она нарезает фото, гифку или видео на эмодзи 100×100 и создаёт пак, который собирает картинку в одном сообщении." },
      { q: "Паки бесплатные?", a: "Добавить пак бесплатно. Паки принадлежат авторам и раздаются Telegram; библиотека только ссылается на них." },
    ],
    keywords: ["премиум эмодзи телеграм", "эмодзи паки телеграм", "кастомные эмодзи", "id эмодзи телеграм", "эмодзи для бота"],
  },
  uk: {
    title: "Преміум емодзі Telegram: бібліотека емодзі-паків та ID",
    description:
      "Шукайте емодзі-паки Telegram за назвою, змістом або емодзі. Додайте пак в один дотик, скопіюйте ID кастомного емодзі, HTML для повідомлення або icon_custom_emoji_id для кнопки бота.",
    h1: "Бібліотека преміум емодзі Telegram",
    lead: "Преміум і кастомні емодзі-паки Telegram з пошуком за назвою, змістом і емодзі, та з ID, які потрібні ботам. Інтерфейс пошуку англійською, але запити можна писати українською.",
    faqTitle: "Питання про преміум емодзі Telegram",
    faq: [
      { q: "Що таке преміум емодзі в Telegram?", a: "Кастомні емодзі — картинки й анімації з емодзі-паків, які Telegram показує прямо в тексті. Додати пак може будь-хто; надсилати такі емодзі в повідомленнях і постах можна з Telegram Premium, а читачі бачать їх і без підписки." },
      { q: "Як додати емодзі-пак у Telegram?", a: "Відкрийте сторінку паку й натисніть Add in Telegram або посилання t.me/addemoji. Telegram покаже пак і додасть його в один дотик." },
      { q: "Як дізнатися ID кастомного емодзі?", a: "Відкрийте пак, натисніть на емодзі й скопіюйте його ID, або вставте ID у пошук на сторінці API, щоб знайти, з якого він паку. ID підставляється в сутність custom_emoji повідомлення або в icon_custom_emoji_id кнопки." },
      { q: "Чи може бот надсилати преміум емодзі?", a: "Так: у повідомленнях, якщо бот має юзернейм з Fragment або якщо власник бота має Telegram Premium — в особистих чатах, групах і супергрупах. На кнопках інлайн-клавіатури icon_custom_emoji_id ставить кастомний емодзі поруч із текстом." },
      { q: "Як зробити власний емодзі-пак з картинки?", a: "У мозаїці з емодзі: вона нарізає фото, гіфку або відео на емодзі 100×100 і створює пак, який складає картинку в одному повідомленні." },
      { q: "Паки безкоштовні?", a: "Додати пак безкоштовно. Паки належать авторам і роздаються Telegram; бібліотека лише посилається на них." },
    ],
    keywords: ["преміум емодзі телеграм", "емодзі паки телеграм", "кастомні емодзі", "id емодзі телеграм"],
  },
};

/** hreflang map for a page that exists in every locale. */
export function languages(path: (l: Locale) => string): Record<string, string> {
  return { ...Object.fromEntries(LOCALES.map((l) => [l, path(l)])), "x-default": path("en") };
}

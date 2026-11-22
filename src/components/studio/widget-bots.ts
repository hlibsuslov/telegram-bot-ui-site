// What the demo bot answers to each widget request. The real bot answers from its server; these
// stand-ins follow the skill's gallery handlers (examples/python/widget_gallery/) so every request
// gets a plausible reply, a new state with the next revision, and an error where one can happen.

export type Lang = "en" | "ru" | "uk";
export type Doc = Record<string, unknown>;
type Text = Record<Lang, string>;

export type BotReply = {
  /** The next chat_data. The widget adopts it when its revision is not older than the one it has. */
  s?: Doc;
  msg?: string;
  /** An error code the widget shows with msg (the request reached the bot and was refused). */
  err?: string;
  /** A later update the bot pushes on its own, such as a confirmed payment. */
  push?: { after: number; s: Doc; note: string };
};
/** Returns undefined for a request the demo bot does not know. */
type Bot = (state: Doc | undefined, data: string, lang: Lang) => BotReply | undefined;

const tr = (text: Text, lang: Lang, vars: Record<string, string> = {}) =>
  text[lang].replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
const next = (state: Doc, patch: Doc): Doc => ({ ...state, ...patch, r: (Number(state.r) || 0) + 1 });
const nowSec = () => Math.floor(Date.now() / 1000);
const money = (minor: number, lang: Lang) =>
  new Intl.NumberFormat(lang, { style: "currency", currency: "EUR" }).format(minor / 100);
const clock = (sec: number, lang: Lang) =>
  new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(sec * 1000);

const ORDER: Record<string, Text | null> = {
  sync: null,
  warm: { en: "We'll keep it warm for 10 minutes", ru: "Сохраним тёплым 10 минут", uk: "Збережемо теплим 10 хвилин" },
  help: { en: "A barista will answer in this chat", ru: "Бариста ответит в этом чате", uk: "Бариста відповість у цьому чаті" },
};

const orderStatus: Bot = (state, data, lang) => {
  if (!Object.hasOwn(ORDER, data)) return undefined;
  const text = ORDER[data];
  return { msg: text ? tr(text, lang) : undefined };
};

type Line = [string, string, number, number];
const STOCK: Record<string, number> = { cr: 3 };
const CART = {
  max: { en: "At most 9 of one item", ru: "Не больше 9 одной позиции", uk: "Не більше 9 однієї позиції" },
  stock: { en: "Only 3 croissants left today", ru: "Сегодня осталось только 3 круассана", uk: "Сьогодні лишилося тільки 3 круасани" },
  removed: { en: "Removed from the order", ru: "Убрали из заказа", uk: "Прибрали із замовлення" },
  stale: { en: "The order changed meanwhile. Check it again", ru: "Заказ уже изменился, проверьте", uk: "Замовлення вже змінилося, перевірте" },
  pickup: { en: "Pickup at the counter by the window", ru: "Самовывоз со стойки у окна", uk: "Самовивіз зі стійки біля вікна" },
  courier: { en: "Courier: about 25 minutes", ru: "Курьер: около 25 минут", uk: "Кур’єр: близько 25 хвилин" },
  invoice: { en: "Invoice sent: pay {total} below", ru: "Счёт отправлен: оплатите {total} ниже", uk: "Рахунок надіслано: сплатіть {total} нижче" },
  paid: {
    en: "Two seconds later the bot confirmed the payment and updated the widget.",
    ru: "Через пару секунд бот подтвердил оплату и обновил виджет.",
    uk: "За кілька секунд бот підтвердив оплату й оновив віджет.",
  },
};

const cart: Bot = (state, data, lang) => {
  if (!state || state.ph || !Array.isArray(state.it) || !state.it.length) return undefined;
  const items = (state.it as Line[]).map((line) => [...line] as Line);
  const options = state.dm as [string, number][];
  const q = /^q:(\d+):([+-]1)@(\d+)$/.exec(data);
  if (q) {
    const [line, step, rev] = [Number(q[1]), Number(q[2]), Number(q[3])];
    if (line >= items.length) return undefined;
    if (rev !== state.r) return { err: "stale", msg: tr(CART.stale, lang) };
    const qty = items[line][2] + step;
    if (qty > 9) return { err: "max", msg: tr(CART.max, lang) };
    if (qty > (STOCK[items[line][0]] ?? 9)) return { err: "stock", msg: tr(CART.stock, lang) };
    if (qty < 1) {
      items.splice(line, 1);
      return { s: next(state, { it: items }), msg: tr(CART.removed, lang) };
    }
    items[line][2] = qty;
    return { s: next(state, { it: items }) };
  }
  const dl = /^dl:(\d+)$/.exec(data);
  if (dl) {
    const i = Number(dl[1]);
    if (i >= options.length) return undefined;
    return { s: next(state, { dl: i }), msg: tr(i ? CART.courier : CART.pickup, lang) };
  }
  if (data === "checkout") {
    const total = items.reduce((sum, [, , qty, unit]) => sum + qty * unit, 0) + options[Number(state.dl) || 0][1];
    const awaiting = next(state, { ph: 1 });
    return {
      s: awaiting,
      msg: tr(CART.invoice, lang, { total: money(total, lang) }),
      push: { after: 2600, s: next(awaiting, { ph: 2, no: "#219", rd: nowSec() + 7 * 60 }), note: tr(CART.paid, lang) },
    };
  }
  return undefined;
};

const SLOT = {
  taken: { en: "{time} was just taken. Pick another time", ru: "{time} только что заняли. Выберите другое время", uk: "{time} щойно зайняли. Оберіть інший час" },
  booked: { en: "Booked for {time}. We start brewing 5 minutes before", ru: "Записали на {time}. Начнём готовить за 5 минут", uk: "Записали на {time}. Почнемо готувати за 5 хвилин" },
  cleared: { en: "Time cleared. Pick a new one", ru: "Время сброшено. Выберите новое", uk: "Час скинуто. Оберіть новий" },
  stale: { en: "Times changed meanwhile. Check again", ru: "Время уже изменилось, проверьте", uk: "Час уже змінився, перевірте" },
};
/** The slot someone else books a moment earlier, to show a refused request. */
const CONTESTED = "0:0830";

function slotIndex(state: Doc, raw: string) {
  const m = /^(\d):(\d\d)(\d\d)$/.exec(raw);
  if (!m) return null;
  const [day, minutes] = [Number(m[1]), Number(m[2]) * 60 + Number(m[3])];
  const index = (minutes - Number(state.b)) / Number(state.sp);
  const days = state.m as string[];
  if (day >= days.length || !Number.isInteger(index) || index < 0 || index >= days[day].length * 4) return null;
  return { day, index, label: `${Number(m[2])}:${m[3]}` };
}
function withSlot(state: Doc, day: number, index: number, free: boolean) {
  const days = [...(state.m as string[])];
  const value = parseInt(days[day], 16);
  days[day] = (free ? value | (1 << index) : value & ~(1 << index)).toString(16).padStart(days[day].length, "0");
  return days;
}
const isFree = (state: Doc, day: number, index: number) => ((parseInt((state.m as string[])[day], 16) >> index) & 1) === 1;

const pickupTime: Bot = (state, data, lang) => {
  if (!state) return undefined;
  const pick = /^pick:(\d:\d{4})@(\d+)$/.exec(data);
  if (pick) {
    const slot = slotIndex(state, pick[1]);
    if (!slot || state.bk) return undefined;
    if (Number(pick[2]) !== state.r) return { err: "stale", msg: tr(SLOT.stale, lang) };
    if (!isFree(state, slot.day, slot.index) || pick[1] === CONTESTED) {
      return { s: next(state, { m: withSlot(state, slot.day, slot.index, false), sel: "" }), err: "taken", msg: tr(SLOT.taken, lang, { time: slot.label }) };
    }
    return { s: next(state, { sel: pick[1] }) };
  }
  if (data === "book") {
    const slot = typeof state.sel === "string" ? slotIndex(state, state.sel) : null;
    if (!slot || state.bk) return undefined;
    const days: Text = { en: ["today", "tomorrow"][slot.day] ?? "", ru: ["сегодня", "завтра"][slot.day] ?? "", uk: ["сьогодні", "завтра"][slot.day] ?? "" };
    const when = [days[lang], slot.label].filter(Boolean).join(", ");
    return { s: next(state, { m: withSlot(state, slot.day, slot.index, false), sel: "", bk: state.sel }), msg: tr(SLOT.booked, lang, { time: when }) };
  }
  if (data === "cancel") {
    const slot = typeof state.bk === "string" ? slotIndex(state, state.bk) : null;
    if (!slot) return undefined;
    return { s: next(state, { m: withSlot(state, slot.day, slot.index, true), bk: "" }), msg: tr(SLOT.cleared, lang) };
  }
  return undefined;
};

const RATE = {
  thanks: { en: "Thanks for the feedback", ru: "Спасибо за отзыв", uk: "Дякуємо за відгук" },
  sorry: { en: "Sorry. We'll make it right", ru: "Простите. Мы всё исправим", uk: "Вибачте. Ми все виправимо" },
  again: { en: "You already rated this order", ru: "Вы уже оценили этот заказ", uk: "Ви вже оцінили це замовлення" },
};

const rateDrink: Bot = (state, data, lang) => {
  const m = /^r:([1-5]):(\d{1,2})$/.exec(data);
  if (!state || !m || Number(m[2]) > 15) return undefined;
  if (state.k) return { err: "rated", msg: tr(RATE.again, lang) };
  const stars = Number(m[1]);
  const happy = stars > 3;
  return { s: next(state, { v: stars, m: Number(m[2]), k: 1, c: happy ? "PULLOA-K7Q2" : "PULLOA-FREE" }), msg: tr(happy ? RATE.thanks : RATE.sorry, lang) };
};

const HAPPY = {
  ready: { en: "Here is your code", ru: "Вот ваш код", uk: "Ось ваш код" },
  over: { en: "Happy hour just ended. See you tomorrow", ru: "Счастливый час только что закончился. До завтра", uk: "Щаслива година щойно закінчилася. До завтра" },
};

const happyHour: Bot = (state, data, lang) => {
  if (!state || data !== "code") return undefined;
  if (nowSec() >= Number(state.d)) return { err: "over", msg: tr(HAPPY.over, lang) };
  return { s: state.c ? undefined : next(state, { c: "ICED30-7QK" }), msg: tr(HAPPY.ready, lang) };
};

const MATCH = {
  found: { en: "Matched: {drink}", ru: "Подобрали: {drink}", uk: "Підібрали: {drink}" },
  added: { en: "Added. Ready about {time}", ru: "Добавили. Будет готов около {time}", uk: "Додали. Буде готове близько {time}" },
  again: { en: "It is already in your order", ru: "Уже в вашем заказе", uk: "Уже у вашому замовленні" },
};
const DRINKS: Record<string, [Text, number]> = {
  fw: [{ en: "Flat white", ru: "Флэт уайт", uk: "Флет вайт" }, 390],
  cp: [{ en: "Cappuccino", ru: "Капучино", uk: "Капучино" }, 360],
  il: [{ en: "Iced latte", ru: "Айс-латте", uk: "Айс-лате" }, 420],
  am: [{ en: "Americano", ru: "Американо", uk: "Американо" }, 300],
  cb: [{ en: "Cold brew", ru: "Колд брю", uk: "Колд брю" }, 380],
  ch: [{ en: "Chai latte", ru: "Чай-латте", uk: "Чай-лате" }, 410],
};

/** Answers: hot or iced, whole, oat or no milk, gentle or bold. */
function matchDrink(iced: number, milk: number, bold: number): [string, string] {
  const milkKey = ["dairy", "oat", ""][milk];
  if (milk === 2) return [iced ? "cb" : "am", ""];
  if (iced) return ["il", milkKey];
  if (bold) return ["fw", milkKey];
  return [milk === 1 ? "ch" : "cp", milkKey];
}

const drinkMatch: Bot = (state, data, lang) => {
  if (!state) return undefined;
  const m = /^m:([01])\.([012])\.([01])$/.exec(data);
  if (m) {
    const [drink, milk] = matchDrink(Number(m[1]), Number(m[2]), Number(m[3]));
    return { s: next(state, { a: `${m[1]}.${m[2]}.${m[3]}`, p: [drink, milk, DRINKS[drink][1]], ad: 0 }), msg: tr(MATCH.found, lang, { drink: tr(DRINKS[drink][0], lang) }) };
  }
  if (data === "add" && Array.isArray(state.p)) {
    if (state.ad) return { err: "added", msg: tr(MATCH.again, lang) };
    return { s: next(state, { ad: 1 }), msg: tr(MATCH.added, lang, { time: clock(nowSec() + 6 * 60, lang) }) };
  }
  return undefined;
};

export const WIDGET_BOTS = {
  "order-status": orderStatus,
  cart,
  "pickup-time": pickupTime,
  "rate-drink": rateDrink,
  "happy-hour": happyHour,
  "drink-match": drinkMatch,
} satisfies Record<string, Bot>;

export type WidgetId = keyof typeof WIDGET_BOTS;

/*@lang en*/K.add({ en: { fw: "Flat white, oat milk", h: "How was your coffee?", p0: "Great taste", p1: "Just the right temperature", p2: "Ready on time",
        p3: "Friendly barista", n0: "Too bitter", n1: "Lukewarm", n2: "Long wait", n3: "Wrong drink", sd: "Send", cm: "Write a comment",
        cp: "Copy", cpd: "Copied", cu: "−10% on your next drink", cu2: "Your next drink is on us", th: "Thank you! Here is a little thank-you back.",
        sr: "Sorry about that. The shift lead will message you here.", al: "You already rated this order", none: "Nothing to rate yet." } });/*@end*/
/*@lang ru*/K.add({ ru: { fw: "Флэт уайт на овсяном", h: "Как вам кофе?", p0: "Отличный вкус", p1: "Идеальная температура", p2: "Готово вовремя",
        p3: "Приветливый бариста", n0: "Слишком горько", n1: "Едва тёплый", n2: "Долго ждал", n3: "Не тот напиток", sd: "Отправить", cm: "Написать комментарий",
        cp: "Копировать", cpd: "Скопировано", cu: "−10% на следующий напиток", cu2: "Следующий напиток за наш счёт", th: "Спасибо! Вот небольшой подарок в ответ.",
        sr: "Простите за это. Старший смены напишет вам здесь.", al: "Вы уже оценили этот заказ", none: "Пока нечего оценивать." } });/*@end*/
/*@lang uk*/K.add({ uk: { fw: "Флет вайт на вівсяному", h: "Як вам кава?", p0: "Чудовий смак", p1: "Ідеальна температура", p2: "Готово вчасно",
        p3: "Привітний бариста", n0: "Занадто гірко", n1: "Ледь теплий", n2: "Довго чекав", n3: "Не той напій", sd: "Надіслати", cm: "Написати коментар",
        cp: "Копіювати", cpd: "Скопійовано", cu: "−10% на наступний напій", cu2: "Наступний напій за наш рахунок", th: "Дякуємо! Ось невеликий подарунок у відповідь.",
        sr: "Вибачте за це. Старший зміни напише вам тут.", al: "Ви вже оцінили це замовлення", none: "Поки нічого оцінювати." } });/*@end*/
var st = 0, mk = 0;
function draw() {
  var s = K.S.chatData, $ = K.$, b, a = $("sr"), c = $("tg"), n = $("ac"), dn = s && s.k, v, m, hi;
  a.innerHTML = c.innerHTML = n.innerHTML = "";
  $("cd").hidden = 1;
  if (!s) { $("ti").textContent = K.t("none"); $("hh").textContent = $("no").textContent = ""; return; }
  v = dn ? s.v : st; m = dn ? s.m : mk; hi = v > 3;
  $("ti").textContent = K.t(s.o);
  $("no").textContent = s.no || "";
  $("hh").textContent = dn ? K.t(s.k > 1 ? "al" : s.v > 3 ? "th" : "sr") : K.t("h");
  [1, 2, 3, 4, 5].forEach(function (i) {
    b = K.h("button", i <= v ? "on" : "", "★");
    b.setAttribute("aria-label", i + "/5");
    b.setAttribute("aria-pressed", i == v);
    b.disabled = !!dn;
    b.onclick = function () { if ((st > 3) != (i > 3)) mk = 0; st = i; draw(); };
    a.appendChild(b);
  });
  if (v) [0, 1, 2, 3].forEach(function (j) {
    if (dn && !(m >> j & 1)) return;
    b = K.h("button", "ch" + (m >> j & 1 ? " on" : ""), K.t((hi ? "p" : "n") + j));
    b.setAttribute("aria-pressed", !!(m >> j & 1));
    b.disabled = !!dn;
    b.onclick = function () { mk ^= 1 << j; draw(); };
    c.appendChild(b);
  });
  if (!dn) {
    b = K.h("button", "", K.t("sd"));
    b.disabled = K.busy || !K.can() || !st;
    b.onclick = function () { K.ask("r:" + st + ":" + mk); };
    n.appendChild(b);
  }
  b = K.h("button", "ch", K.t("cm"));
  b.onclick = function () { try { W.openTelegramLink("https://t.me/example_bot?start=comment"); } catch (e) {} };
  n.appendChild(b);
  if (dn && s.c) {
    $("cd").hidden = 0;
    $("cu").textContent = K.t(s.v > 3 ? "cu" : "cu2"); $("cc").textContent = s.c; $("cb").textContent = K.t("cp");
    $("cb").onclick = function () { try { W.copyText(s.c); K.st(K.t("cpd"), "ok"); } catch (e) {} };
  }
}
K.start(draw);

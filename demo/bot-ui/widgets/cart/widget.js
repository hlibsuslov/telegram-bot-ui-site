/*@lang en*/K.add({ en: { cart: "Your order", sub: "Subtotal", tot: "Total", free: "Free", co: "Checkout",
        wait2: "Awaiting payment", paid: "Paid", rd: "Ready about", at: "Pick it up at the counter by the window",
        empty: "Your order is empty. Add drinks from the menu.",
        fw: "Flat white", cp: "Cappuccino", il: "Iced latte", cr: "Butter croissant", cn: "Cinnamon roll", oat: "oat milk", dairy: "whole milk", pk: "Pickup", cu: "Courier", none: "No order yet. The bot will fill this in." } });/*@end*/
/*@lang ru*/K.add({ ru: { cart: "Ваш заказ", sub: "Товары", tot: "Итого", free: "Бесплатно", co: "Оформить",
        wait2: "Ждём оплату", paid: "Оплачено", rd: "Будет готов около", at: "Заберите на стойке у окна",
        empty: "Заказ пуст. Добавьте напитки из меню.",
        fw: "Флэт уайт", cp: "Капучино", il: "Айс-латте", cr: "Сливочный круассан", cn: "Синнабон", oat: "овсяное молоко", dairy: "обычное молоко", pk: "Самовывоз", cu: "Курьер", none: "Заказа пока нет. Бот его пришлёт." } });/*@end*/
/*@lang uk*/K.add({ uk: { cart: "Ваше замовлення", sub: "Товари", tot: "Разом", free: "Безкоштовно", co: "Оформити",
        wait2: "Чекаємо оплату", paid: "Оплачено", rd: "Буде готове близько", at: "Заберіть на стійці біля вікна",
        empty: "Замовлення порожнє. Додайте напої з меню.",
        fw: "Флет вайт", cp: "Капучино", il: "Айс-лате", cr: "Вершковий круасан", cn: "Синабон", oat: "вівсяне молоко", dairy: "звичайне молоко", pk: "Самовивіз", cu: "Кур’єр", none: "Замовлення поки немає. Бот його надішле." } });/*@end*/
var last = "";
function draw() {
  var s = K.S.chatData, $ = K.$, dis = K.busy || !K.can();
  ["ls", "tl", "dv", "pd"].forEach(function (x) { $(x).innerHTML = ""; });
  $("pl").textContent = "";
  $("co").hidden = $("pd").hidden = 1;
  if (!s) { $("ti").textContent = K.t("none"); return; }
  $("ti").textContent = s.no && s.ph == 2 ? K.t("cart") + " " + s.no : K.t("cart");
  var it = s.it || [], m = function (v) { return K.money(v, s.cur); }, lock = s.ph > 0;
  if (!it.length) { $("ls").appendChild(K.h("div", "mt em", K.t("empty"))); return; }
  var sub = 0;
  it.forEach(function (x) { sub += x[2] * x[3]; });
  it.forEach(function (x, i) {
    var l = K.h("div", "ln"), a = K.h("div", "rw"), b = K.h("div", "rw");
    a.appendChild(K.h("span", "gr el", K.t(x[0])));
    a.appendChild(K.h("span", "", m(x[2] * x[3])));
    b.appendChild(K.h("span", "mt gr el", x[1].split(" ").map(K.t).join(" · ")));
    var qs = K.h("div", "qs");
    [-1, 1].forEach(function (d, j) {
      if (j) qs.appendChild(K.h("b", "", (lock ? "× " : "") + x[2]));
      if (lock) return;
      var c = K.h("button", "ch", d < 0 ? "−" : "+");
      c.setAttribute("aria-label", (d < 0 ? "−1 " : "+1 ") + K.t(x[0]));
      c.disabled = dis || x[2] + d > 9;
      c.onclick = function () { K.ask("q:" + i + ":" + (d < 0 ? "-1" : "+1") + "@" + K.R.chatData); };
      qs.appendChild(c);
    });
    b.appendChild(qs);
    l.appendChild(a); l.appendChild(b);
    $("ls").appendChild(l);
  });
  var dl = (s.dm || [])[s.dl] || ["", 0], tot = sub + dl[1];
  [[K.t("sub"), m(sub)], [K.t(dl[0]), dl[1] ? m(dl[1]) : K.t("free")], [K.t("tot"), m(tot)]].forEach(function (r, i) {
    var d = K.h("div", "tt2" + (i == 2 ? " tot" : ""));
    d.appendChild(K.h("span", "", r[0])); d.appendChild(K.h("span", "", r[1]));
    $("tl").appendChild(d);
  });
  if (last && last != m(tot)) $("tl").lastChild.className += " fl";
  last = m(tot);
  if (s.ph == 2) {
    $("pl").textContent = K.t("paid"); $("pl").className = "pl ok";
    if (!K.busy) K.st("");
    $("pd").hidden = 0;
    $("pd").appendChild(K.h("b", "", K.t("rd") + " " + K.time(s.rd)));
    $("pd").appendChild(K.h("span", "mt", K.t("at")));
    return;
  }
  $("pl").className = "pl";
  (s.dm || []).forEach(function (o, i) {
    var c = K.h("button", "ch" + (i == s.dl ? " on" : ""), K.t(o[0]) + (o[1] ? " · " + m(o[1]) : ""));
    c.disabled = dis || lock;
    c.setAttribute("aria-pressed", i == s.dl);
    c.onclick = function () { if (i != s.dl) K.ask("dl:" + i); };
    $("dv").appendChild(c);
  });
  $("co").hidden = 0;
  $("co").textContent = lock ? K.t("wait2") : K.t("co") + " · " + m(tot);
  $("co").disabled = dis || lock;
  $("co").onclick = function () { K.ask("checkout"); };
  if (lock) $("pl").textContent = K.t("wait2");
}
K.start(draw);

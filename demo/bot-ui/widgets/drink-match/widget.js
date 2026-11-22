/*@lang en*/K.add({ en: { ti: "Find your drink", qn: "# of %", q0: "Hot or iced?", q1: "Which milk?", q2: "How strong?",
        a0: ["Hot", "Iced"], a1: ["Whole milk", "Oat milk", "No milk"], a2: ["Gentle", "Bold"], ym: "Your match",
        fw: "Flat white", cp: "Cappuccino", il: "Iced latte", am: "Americano", cb: "Cold brew", ch: "Chai latte",
        fw_d: "Double ristretto with silky milk", cp_d: "Espresso under a cloud of milk foam", il_d: "Espresso and cold milk over ice",
        am_d: "Espresso and hot water, clean and strong", cb_d: "Steeped for 16 hours, smooth and bold", ch_d: "Spiced black tea with steamed milk",
        oat: "oat milk", dairy: "whole milk", add: "Add to order", in: "In your order", ag: "Start over" } });/*@end*/
/*@lang ru*/K.add({ ru: { ti: "Подберём напиток", qn: "# из %", q0: "Горячий или холодный?", q1: "Какое молоко?", q2: "Насколько крепкий?",
        a0: ["Горячий", "Холодный"], a1: ["Обычное", "Овсяное", "Без молока"], a2: ["Мягкий", "Крепкий"], ym: "Вам подойдёт",
        fw: "Флэт уайт", cp: "Капучино", il: "Айс-латте", am: "Американо", cb: "Колд брю", ch: "Чай-латте",
        fw_d: "Двойной ристретто и шелковистое молоко", cp_d: "Эспрессо под облаком молочной пены", il_d: "Эспрессо и холодное молоко со льдом",
        am_d: "Эспрессо и горячая вода, чисто и крепко", cb_d: "Настаивается 16 часов, мягкий и насыщенный", ch_d: "Пряный чёрный чай с горячим молоком",
        oat: "овсяное молоко", dairy: "обычное молоко", add: "Добавить в заказ", in: "Уже в заказе", ag: "Пройти заново" } });/*@end*/
/*@lang uk*/K.add({ uk: { ti: "Підберемо напій", qn: "# з %", q0: "Гарячий чи холодний?", q1: "Яке молоко?", q2: "Наскільки міцний?",
        a0: ["Гарячий", "Холодний"], a1: ["Звичайне", "Вівсяне", "Без молока"], a2: ["М’який", "Міцний"], ym: "Вам підійде",
        fw: "Флет вайт", cp: "Капучино", il: "Айс-лате", am: "Американо", cb: "Колд брю", ch: "Чай-лате",
        fw_d: "Подвійний ристрето й шовковисте молоко", cp_d: "Еспресо під хмаркою молочної піни", il_d: "Еспресо й холодне молоко з льодом",
        am_d: "Еспресо й гаряча вода, чисто й міцно", cb_d: "Настоюється 16 годин, м’який і насичений", ch_d: "Пряний чорний чай із гарячим молоком",
        oat: "вівсяне молоко", dairy: "звичайне молоко", add: "Додати в замовлення", in: "Уже в замовленні", ag: "Пройти знову" } });/*@end*/
var i = 0, A = [], re = 0, $ = K.$;
$("ag").onclick = function () { i = 0; A = []; re = 1; K.st(""); draw(); };
$("ad").onclick = function () { K.ask("add"); };
function draw() {
  var s = K.S.chatData || {}, dis = K.busy || !K.can(), done = !!s.a && !re, p = s.p;
  $("qz").hidden = done;
  $("rs").hidden = !done;
  $("ti").textContent = K.t("ti");
  if (done && p) {
    $("ym").textContent = K.t("ym");
    $("nm").textContent = K.t(p[0]);
    $("pr").textContent = K.money(p[2], s.cur || "EUR");
    $("ds").textContent = K.t(p[0] + "_d") + (p[1] ? " · " + K.t(p[1]) : "");
    $("ad").textContent = s.ad ? K.t("in") + " ✓" : K.t("add") + " · " + K.money(p[2], s.cur || "EUR");
    $("ad").disabled = dis || !!s.ad;
    $("ag").textContent = K.t("ag");
    return;
  }
  var n = Math.min(i, 2);
  $("qn").textContent = K.t("qn").replace("#", n + 1).replace("%", 3);
  $("pb").style.width = 100 * i / 3 + "%";
  $("qq").textContent = K.t("q" + n);
  var an = $("an"); an.innerHTML = ""; an.className = "ol " + (n % 2 ? "fa" : "fb"); $("qq").className = "qq " + (n % 2 ? "fa" : "fb");
  K.t("a" + n).forEach(function (t, j) {
    var b = K.h("button", "ch" + (A[n] === j ? " on" : ""), t);
    b.disabled = dis;
    b.onclick = function () {
      A[n] = j;
      if (n < 2) { i = n + 1; draw(); return; }
      i = 3;
      if (K.ask("m:" + A.join("."), { then: function () { re = 0; } })) return;
      i = 2; draw();
    };
    an.appendChild(b);
  });
}
K.start(draw);

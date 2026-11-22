/*@lang en*/K.add({ en: { ti: "Pickup time", at: "Pulloa, 12 Harbour St", d0: "Today", d1: "Tomorrow", conf: "Confirm", bk: "We'll have it ready at",
        canc: "Change time", full: "No free times on this day.", tk: "That time is taken", none: "No order yet. The bot will fill this in." } });/*@end*/
/*@lang ru*/K.add({ ru: { ti: "Время самовывоза", at: "Pulloa, Портовая, 12", d0: "Сегодня", d1: "Завтра", conf: "Подтвердить", bk: "Приготовим к",
        canc: "Изменить время", full: "В этот день свободного времени нет.", tk: "Это время занято", none: "Заказа пока нет. Бот его пришлёт." } });/*@end*/
/*@lang uk*/K.add({ uk: { ti: "Час самовивозу", at: "Pulloa, Портова, 12", d0: "Сьогодні", d1: "Завтра", conf: "Підтвердити", bk: "Приготуємо на",
        canc: "Змінити час", full: "Цього дня вільного часу немає.", tk: "Цей час зайнято", none: "Замовлення поки немає. Бот його надішле." } });/*@end*/
var dy = -1;
function p2(n) { return (n < 10 ? "0" : "") + n; }
function draw() {
  var s = K.S.chatData, $ = K.$, dis = K.busy || !K.can(), d, i;
  ["ds", "gd", "bs", "ft"].forEach(function (x) { $(x).innerHTML = ""; });
  $("bs").hidden = 1; $("bs").className = "sf bs";
  if (!s) { $("ti").textContent = K.t("none"); $("no").textContent = $("du").textContent = ""; return; }
  var hm = function (i, c) { var n = s.b + s.sp * i; return p2(n / 60 | 0) + (c ? ":" : "") + p2(n % 60); };
  var lbl = function (n, o) { return n < 2 ? K.t("d" + n) : K.time(s.d0 + n * 86400, o || { weekday: "short" }); };
  var free = function (n, j) { return parseInt(s.m[n], 16) >> j & 1; };
  var any = s.m.map(function (x) { return parseInt(x, 16) > 0; });
  var slots = Math.min(24, (s.m[0] || "").length * 4);
  $("ti").textContent = K.t("ti");
  $("no").textContent = s.no;
  $("du").textContent = K.t("at");
  var at = s.bk || s.sel;
  if (dy < 0) dy = at ? +at.split(":")[0] : Math.max(0, any.indexOf(true));
  if (s.bk) {
    var a = s.bk.split(":");
    var b = $("bs"); b.hidden = 0; b.className = "sf bs in";
    b.appendChild(K.h("span", "mt", K.t("bk")));
    b.appendChild(K.h("b", "", lbl(+a[0], { weekday: "long" }) + ", " + a[1].slice(0, 2) + ":" + a[1].slice(2)));
    var c = K.h("button", "", K.t("canc")); c.disabled = dis;
    c.onclick = function () { K.ask("cancel"); };
    $("ft").appendChild(c);
    $("ds").hidden = $("gd").hidden = 1;
    return;
  }
  $("ds").hidden = $("gd").hidden = 0;
  for (d = 0; d < s.m.length; d++) (function (d) {
    var e = K.h("button", "ch" + (d == dy ? " on" : any[d] ? "" : " tk"));
    e.setAttribute("aria-pressed", d == dy);
    e.appendChild(K.h("b", "", lbl(d)));
    e.onclick = function () { dy = d; K.st(""); draw(); };
    $("ds").appendChild(e);
  })(d);
  if (!any[dy]) { $("gd").appendChild(K.h("div", "mt", K.t("full"))); $("gd").style.display = "block"; }
  else {
    $("gd").style.display = "";
    for (i = 0; i < slots; i++) (function (i) {
      var f = free(dy, i), on = s.sel == dy + ":" + hm(i);
      var e = K.h("button", "ch" + (on ? " on" : f ? "" : " tk"), hm(i, 1));
      e.setAttribute("aria-pressed", on);
      e.disabled = f && dis;
      e.onclick = function () { if (f) K.ask("pick:" + dy + ":" + hm(i) + "@" + K.R.chatData); else K.st(K.t("tk"), "e"); };
      $("gd").appendChild(e);
    })(i);
  }
  var sel = s.sel && s.sel.split(":");
  var g = K.h("button", "", K.t("conf") + (sel ? " · " + lbl(+sel[0]) + ", " + sel[1].slice(0, 2) + ":" + sel[1].slice(2) : ""));
  g.disabled = dis || !s.sel;
  g.onclick = function () { K.ask("book"); };
  $("ft").appendChild(g);
}
K.start(draw);

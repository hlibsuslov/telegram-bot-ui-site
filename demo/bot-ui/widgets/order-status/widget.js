/*@lang en*/K.add({ en: { p0: "Received", p1: "Brewing", p2: "Ready at the counter", p3: "Picked up",
        late: "Running late", ready: "Ready about", done: "Enjoy your coffee", bar: "Barista",
        warm: "Keep it warm", help: "Help", none: "No order yet. The bot will fill this in." } });/*@end*/
/*@lang ru*/K.add({ ru: { p0: "Принят", p1: "Готовим", p2: "Ждёт на стойке", p3: "Получен",
        late: "Задерживается", ready: "Будет готов около", done: "Приятного кофе", bar: "Бариста",
        warm: "Сохраните тёплым", help: "Помощь", none: "Заказа пока нет. Бот его пришлёт." } });/*@end*/
/*@lang uk*/K.add({ uk: { p0: "Прийнято", p1: "Готуємо", p2: "Чекає на стійці", p3: "Отримано",
        late: "Затримується", ready: "Буде готове близько", done: "Смачної кави", bar: "Бариста",
        warm: "Збережіть теплим", help: "Допомога", none: "Замовлення поки немає. Бот його надішле." } });/*@end*/
function draw() {
  var s = K.S.chatData, $ = K.$;
  if (!s) { $("ti").textContent = K.t("none"); $("pl").textContent = ""; $("eta").textContent = ""; $("tl").innerHTML = ""; $("ba").hidden = 1; $("ac").innerHTML = ""; $("bar").style.width = "0"; return; }
  var m = s.m | 0, st = Math.max(0, Math.min(3, s.s | 0)), live = st < 3, dis = K.busy || !K.can();
  $("ti").textContent = s.no;
  var pl = $("pl");
  pl.textContent = K.t(live && m ? "late" : "p" + st);
  pl.className = "pl s" + (st >= 2 ? 2 : m ? 1 : 0);
  $("eta").textContent = st < 2 ? K.t("ready") + " " + K.time(s.eta) : st == 3 ? K.t("done") : "";
  $("bar").style.width = (st / 3 * 100) + "%";
  var tl = $("tl"); tl.innerHTML = "";
  for (var i = 0; i < 4; i++) {
    var r = K.h("div", "sp" + (i < st || st == 3 ? " d" : i == st ? " c" + (m ? " w" : "") : ""));
    r.appendChild(K.h("i"));
    r.appendChild(K.h("b", "el", K.t("p" + i)));
    r.appendChild(K.h("span", "mt", s["t" + i] ? K.time(s["t" + i]) : ""));
    tl.appendChild(r);
  }
  var ba = !!s.ba && live;
  $("ba").hidden = !ba;
  if (ba) { $("bn").textContent = s.ba; $("bl").textContent = K.t("bar"); }
  var ac = $("ac"); ac.innerHTML = "";
  [["warm", st == 2], ["help", live]].forEach(function (a) {
    if (!a[1]) return;
    var b = K.h("button", "", K.t(a[0]));
    b.disabled = dis;
    b.onclick = function () { K.ask(a[0]); };
    ac.appendChild(b);
  });
}
K.start(draw, { sync: "sync" });

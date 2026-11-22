/*@lang en*/K.add({ en: { title: "Loyalty card", of: "of", left1: "One more drink and the next is free", left: "more drinks for a free one",
        free: "Your next drink is on us", code: "Show code at the counter", none: "No card yet. The bot will fill this in." } });/*@end*/
/*@lang ru*/K.add({ ru: { title: "Карта гостя", of: "из", left1: "Ещё один напиток, и следующий бесплатно", left: "напитка до бесплатного",
        free: "Следующий напиток за наш счёт", code: "Код для бариста", none: "Карты пока нет. Бот её пришлёт." } });/*@end*/
/*@lang uk*/K.add({ uk: { title: "Картка гостя", of: "з", left1: "Ще один напій, і наступний безкоштовно", left: "напої до безкоштовного",
        free: "Наступний напій за наш рахунок", code: "Код для баристи", none: "Картки поки немає. Бот її надішле." } });/*@end*/
function draw() {
  var s = K.S.chatData, $ = K.$, gd = $("gd");
  gd.innerHTML = "";
  if (!s) { $("ti").textContent = K.t("none"); $("ct").textContent = ""; $("lf").textContent = ""; $("cd").hidden = 1; return; }
  var of = Math.max(1, Math.min(10, s.of | 0 || 10)), n = Math.max(0, Math.min(of, s.n | 0)), left = of - n;
  $("ti").textContent = s.name ? s.name + " · " + K.t("title") : K.t("title");
  $("ct").textContent = n + " " + K.t("of") + " " + of;
  for (var i = 0; i < of; i++) {
    var last = i == of - 1;
    gd.appendChild(K.h("span", (i < n ? "on" : "") + (last ? " gift" : ""), last ? "★" : i < n ? "☕" : ""));
  }
  $("lf").textContent = left <= 0 ? K.t("free") : left == 1 ? K.t("left1") : left + " " + K.t("left");
  var b = $("cd");
  b.hidden = 0;
  b.textContent = K.t("code");
  b.disabled = K.busy || !K.can();
  b.onclick = function () { K.ask("code"); };
}
K.start(draw);

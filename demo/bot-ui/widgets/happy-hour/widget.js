/*@lang en*/K.add({ en: { ti: "Happy hour", tx: "All iced drinks until", go: "Get my code", cn: "Tap the code to copy it. Show it at the counter or enter it at checkout.",
        cpd: "Copied", over: "Happy hour is over. Next one:", h: "h", m: "min", s: "s", none: "No offer right now." } });/*@end*/
/*@lang ru*/K.add({ ru: { ti: "Счастливый час", tx: "Все холодные напитки до", go: "Получить код", cn: "Нажмите на код, чтобы скопировать. Покажите его на стойке или введите при оплате.",
        cpd: "Скопировано", over: "Счастливый час закончился. Следующий:", h: "ч", m: "мин", s: "с", none: "Сейчас акций нет." } });/*@end*/
/*@lang uk*/K.add({ uk: { ti: "Щаслива година", tx: "Усі холодні напої до", go: "Отримати код", cn: "Натисніть на код, щоб скопіювати. Покажіть його на стійці або введіть під час оплати.",
        cpd: "Скопійовано", over: "Щаслива година закінчилася. Наступна:", h: "год", m: "хв", s: "с", none: "Зараз акцій немає." } });/*@end*/
var iv = 0, $ = K.$;
$("cp").onclick = function () { var s = K.S.chatData; if (s && s.c) { try { W.copyText(s.c); K.st(K.t("cpd"), "ok"); } catch (e) {} } };
$("go").onclick = function () { K.ask("code"); };
function p2(n) { return (n < 10 ? "0" : "") + n; }
function draw() {
  var s = K.S.chatData;
  if (!s) { $("ti").textContent = K.t("none"); ["pl", "tx", "cd", "cp", "cn", "go"].forEach(function (x) { $(x).hidden = 1; }); return; }
  var t = Math.max(0, s.d - Date.now() / 1000 | 0), on = t > 0, v = [t / 3600 | 0, t / 60 % 60 | 0, t % 60], h = v[0] > 0;
  $("ti").textContent = K.t("ti");
  $("pl").hidden = 0; $("pl").textContent = "−" + s.pc + "%"; $("pl").className = "pl" + (on ? "" : " off");
  var day = { weekday: "long", hour: "2-digit", minute: "2-digit" };
  $("tx").textContent = on ? K.t("tx") + " " + K.time(s.d) : K.t("over") + " " + K.time(s.nx, day);
  $("cd").hidden = !on; $("cd").className = "cd" + (t < 60 ? " lw" : "");
  // Hours, minutes, seconds; under an hour: minutes and seconds only.
  [h ? v[0] : v[1], h ? v[1] : v[2], v[2]].forEach(function (n, i) { $("v" + i).textContent = p2(n); });
  $("u0").textContent = K.t(h ? "h" : "m"); $("u1").textContent = K.t(h ? "m" : "s"); $("u2").textContent = K.t("s");
  $("u2").parentNode.hidden = !h;
  $("cp").hidden = $("cn").hidden = !(on && s.c);
  if (s.c && $("cp").textContent != s.c) $("cp").textContent = s.c;
  $("go").hidden = !on || !!s.c;
  $("go").textContent = K.t("go");
  $("go").disabled = K.busy || !K.can();
  $("cn").textContent = K.t("cn");
  if (!on && iv) { clearInterval(iv); iv = 0; }
  if (on && !iv) iv = setInterval(draw, 1000);
}
K.start(draw);

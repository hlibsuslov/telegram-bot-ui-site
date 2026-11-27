// Tells Bing, Yandex and the other IndexNow engines (Bing's index also feeds ChatGPT search) which pages changed.
// The key is the file public/<key>.txt. Usage: node scripts/indexnow.mjs [url-path ...]; with no paths it sends the
// emoji landings in every language.
import { readdirSync, readFileSync } from "node:fs";

const host = "telegram-bot-ui.hlixli.com";
const keyFile = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt)");
const key = readFileSync(`public/${keyFile}`, "utf8").trim();
const paths = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/emoji", "/emoji/ru", "/emoji/uk", "/emoji/mosaic", "/emoji/ru/mosaic", "/emoji/uk/mosaic", "/emoji/custom-emoji-guide", "/emoji/api-docs", "/llms.txt"];
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation: `https://${host}/${keyFile}`, urlList: paths.map((p) => `https://${host}${p}`) }),
});
console.log(res.status, res.statusText, await res.text());

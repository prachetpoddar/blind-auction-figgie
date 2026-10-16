// Regression test for the V18 bug: after an X-ray, later peeks and scans never draw from that hand.
const fs = require("fs");
const src = fs.readFileSync(require("path").join(__dirname, "../src/logic.js"), "utf8").split("\n").slice(0, 144).join("\n") + "\n" + fs.readFileSync(require("path").join(__dirname, process.env.DESK_SRC || "../src/desk.js"), "utf8");
new Function("console", "process", src + `
let bad = 0, peeks = 0, nulls = 0;
for (let r = 0; r < 2000; r++) {
  const cfg = CONFIGS[Math.floor(rnd() * NC)], deck = shuffle(cfg.c.flatMap((x, s) => Array(x).fill(s)));
  const hands = [0, 1, 2, 3].map(p => { const h = [0, 0, 0, 0]; deck.slice(p * 10, p * 10 + 10).forEach(s => h[s]++); return h; });
  const shown = [0, 1, 2, 3].map(() => ({})), x = 1 + Math.floor(rnd() * 3);
  revealCards(0, x, 10, hands, shown);
  for (let k = 0; k < 12; k++) { const r2 = revealCards(0, null, 1, hands, shown); if (!r2) { nulls++; continue; } peeks++; if (r2.owner === x) bad++; }
  const sc = revealCards(0, x, 5, hands, shown); if (sc) bad++;
}
console.log(bad === 0 ? "PASS" : "FAIL", "peeks", peeks, "from an X-rayed hand", bad, "exhausted", nulls);
process.exitCode = bad ? 1 : 0;`)(console, process);

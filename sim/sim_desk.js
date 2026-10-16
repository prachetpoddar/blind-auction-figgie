// Headless 4-player run of rules v4 (data desk menu) using the live Bot class plus desk.js.
const fs = require("fs");
const SEED = +(process.env.SEED || 1);
Math.random = (() => { let a = SEED >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

let src = fs.readFileSync(require("path").join(__dirname, "../src/logic.js"), "utf8").split("\n").slice(0, 144).join("\n");
if (process.env.KAPPA) src = src.replace("[0.75, 0.64, 0.53, 0.49]", process.env.KAPPA);
src += "\n" + fs.readFileSync(process.env.DESK_SRC ? require("path").join(__dirname, process.env.DESK_SRC) : require("path").join(__dirname, "../src/desk.js"), "utf8");
const [mode, N] = [process.argv[2], +process.argv[3]];
const W = JSON.parse(process.env.WIDGETS || "{}"), D = JSON.parse(process.env.DESKCFG || "{}"), TC = JSON.parse(process.env.TYPESCFG || "{}");
const body = src + `
for (const [k, v] of Object.entries(W)) Object.assign(WIDGETS[k], v); Object.assign(DESK, D); for (const [k, v] of Object.entries(TC)) Object.assign(TYPES[k], v);

const out = {}; const add = (t, v) => (out[t] = out[t] || []).push(v);
function play(types) {
  const cfg = CONFIGS[Math.floor(rnd() * NC)];
  const deck = shuffle(cfg.c.flatMap((x, s) => Array(x).fill(s)));
  const hands = [0,1,2,3].map(p => { const h=[0,0,0,0]; deck.slice(p*HAND,(p+1)*HAND).forEach(s=>h[s]++); return h; });
  Object.assign(G, { cfg, chips:[300,300,300,300], sizes:[10,10,10,10] });
  const B = types.map((t,i) => { const b = new Bot(t, i, hands[i]); b.deskInit(); return b; });
  const shown = [0,1,2,3].map(() => ({})), paid=[0,0,0,0], got=[0,1,2,3].map(()=>({peek:0,scan:0,xray:0}));
  for (let k=0;k<4;k++) {
    B.forEach(b=>b.k=k);
    const res = runDesk(B.map(b => b.deskBids(G.chips[b.seat])));
    const buyers = new Set();
    for (const kind of ["peek","scan","xray"]) for (const e of res[kind].win) {
      if (G.chips[e.p] < res[kind].price) continue;   // as in the live placeDesk: a lot the winner cannot pay goes unsold
      const r = revealCards(e.p, kind==="peek" ? null : e.target, WIDGETS[kind].cards, B.map(b=>b.hand), shown); if (!r) continue;
      G.chips[e.p] -= res[kind].price; paid[e.p] += res[kind].price; got[e.p][kind]++; buyers.add(e.p);
      B[e.p].receiveCards(r.owner, r.cards, r.whole);
      if (kind === "peek") { const s = r.cards.findIndex(x=>x>0), cl = B[e.p].cardClaim(s); if (cl!==null) B.forEach(b=>b.hearCardClaim(e.p, cl)); }
    }
    B.forEach(b=>b.observeDesk([...buyers]));
    for (let t=0;t<TICKS;t++) {
      const a = Math.floor(rnd()*4), b=B[a];
      const book = B.filter(o=>o.seat!==a).map(o=>({seat:o.seat, ...o.quotes(a)}));
      const tr = b.chooseTrade(book); if (!tr) continue;
      const [buyer,seller] = tr.side==="buy"?[a,tr.seat]:[tr.seat,a];
      if (G.chips[buyer] < tr.p) continue;
      G.chips[buyer]-=tr.p; G.chips[seller]+=tr.p; G.sizes[buyer]++; G.sizes[seller]--;
      B.forEach(o=>{ o.observeTrade(tr.s,buyer,seller,tr.side==="buy"); o.trackTrade(tr.s,buyer,seller); });
    }
  }
  const g=cfg.goal, n=B.map(b=>b.hand[g]), top=Math.max(...n), win=n.map((x,i)=>x===top?i:-1).filter(i=>i>=0);
  const bonus=POT-GOAL_PAY*cfg.c[g];
  return B.map((b,i)=>({type:b.type, net:G.chips[i]+GOAL_PAY*n[i]+(win.includes(i)?bonus/win.length:0)-START, paid:paid[i], got:got[i]}));
}
const rec = (tag, x) => { add(tag, x.net); add(tag+"|paid", x.paid); for (const k in x.got) add(tag+"|"+k, x.got[k]); };

// share of rounds in which each style finished with the highest net (ties split)
function addPairs(res) { for (const x of res) for (const y of res) if (x.type < y.type) add("pair:" + x.type + "-" + y.type, x.net - y.net); }
function addTop(res) { const m = Math.max(...res.map(x => x.net)), w = res.filter(x => x.net === m); for (const x of res) add(x.type + "|top", w.includes(x) ? 1 / w.length : 0); }
const ALL = Object.keys(TYPES);
for (let r=0;r<N;r++) {
  if (mode==="mixed") { const res = play(shuffle(ALL.slice()).slice(0,4)); for (const x of res) rec(x.type, x); addTop(res); addPairs(res); continue; }
  const opp = mode==="readers" ? ["Cautious","Bluffer","Equilibrium"] : ["Cautious","Naive","Bluffer"];
  const foc = r%2 ? "Equilibrium" : "Info-hungry", seat = Math.floor(rnd()*4), types = opp.slice(); types.splice(seat,0,foc);
  rec("focal:"+foc, play(types)[seat]);
}
const summ = {}; for (const [k,v] of Object.entries(out)) summ[k] = [v.reduce((a,b)=>a+b,0), v.reduce((a,b)=>a+b*b,0), v.length];
console.log(JSON.stringify(summ));
`;
new Function("W","D","TC","mode","N","console", body)(W, D, TC, mode, N, console);

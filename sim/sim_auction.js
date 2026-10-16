// Headless 4-player run of the live bot code: lines 1-144 of logic.js verbatim, all four seats bots.
const fs = require("fs");
const SEED = +(process.env.SEED || 1);
Math.random = (() => { let a = SEED >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

const src = fs.readFileSync(process.env.LOGIC || require("path").join(__dirname, "legacy/logic_v3.js"), "utf8").split("\n").slice(0, 144).join("\n").replace("[0.75, 0.64, 0.53, 0.49]", process.env.KAPPA || "[0.75, 0.64, 0.53, 0.49]");
const mode = process.argv[2], N = +process.argv[3];
const body = src + `
const out = {};
function add(t, v) { (out[t] = out[t] || []).push(v); }
function play(types) {
  const ci = Math.floor(rnd() * NC), cfg = CONFIGS[ci];
  const deck = shuffle(cfg.c.flatMap((x, s) => Array(x).fill(s)));
  const hands = [0,1,2,3].map(p => { const h=[0,0,0,0]; deck.slice(p*HAND,(p+1)*HAND).forEach(s=>h[s]++); return h; });
  Object.assign(G, { cfg, chips:[300,300,300,300], sizes:[10,10,10,10] });
  const B = types.map((t,i) => new Bot(t, i, hands[i]));
  const order = shuffle([0,1,2,3]); const paid=[0,0,0,0], wins=[0,0,0,0];
  for (let k=0;k<4;k++) {
    B.forEach(b=>b.k=k); const X = order[k];
    const bids = B.map(b => b.bid(X, G.chips[b.seat]));
    const top = Math.max(...bids), cand = bids.map((b,i)=>b===top?i:-1).filter(i=>i>=0);
    const w = cand[Math.floor(rnd()*cand.length)], price = bids.slice().sort((a,b)=>a-b)[2];
    G.chips[w]-=price; paid[w]+=price; wins[w]++;
    const isLong = cfg.long===X; B[w].receiveAnswer(X,isLong);
    const sees = bids.map((b,j)=> j===w || b >= WATCH*price);
    B.forEach(b=>b.observeBids(X, sees[b.seat]?bids:null, sees[b.seat]?w:null));
    const claim = B[w].statement(X,isLong); if (claim!==null) B.forEach(b=>b.hearStatement(w,X,claim));
    for (let t=0;t<TICKS;t++) {
      const a = Math.floor(rnd()*4), b=B[a];
      const book = B.filter(o=>o.seat!==a).map(o=>({seat:o.seat, ...o.quotes(a)}));
      const tr = b.chooseTrade(book); if (!tr) continue;
      if (tr.side==="buy" && G.chips[a] < tr.p) continue;
      if (tr.side==="sell" && G.chips[tr.seat] < tr.p) continue;
      const [buyer,seller] = tr.side==="buy"?[a,tr.seat]:[tr.seat,a];
      G.chips[buyer]-=tr.p; G.chips[seller]+=tr.p; G.sizes[buyer]++; G.sizes[seller]--;
      B.forEach(o=>o.observeTrade(tr.s,buyer,seller,tr.side==="buy"));
    }
  }
  const g=cfg.goal, n=B.map(b=>b.hand[g]), top=Math.max(...n), win=n.map((x,i)=>x===top?i:-1).filter(i=>i>=0);
  const bonus=POT-GOAL_PAY*cfg.c[g];
  return B.map((b,i)=>({type:b.type, net:G.chips[i]+GOAL_PAY*n[i]+(win.includes(i)?bonus/win.length:0)-START, paid:paid[i], wins:wins[i]}));
}

// share of rounds in which each style finished with the highest net (ties split)
function addTop(res) { const m = Math.max(...res.map(x => x.net)), w = res.filter(x => x.net === m); for (const x of res) add(x.type + "|top", w.includes(x) ? 1 / w.length : 0); }
const ALL = Object.keys(TYPES);
for (let r=0;r<N;r++) {
  let types;
  if (mode==="mixed") { types = shuffle(ALL.slice()).slice(0,4); const res = play(types); for (const x of res) { add(x.type, x.net); add(x.type+"|paid", x.paid); add(x.type+"|wins", x.wins); } addTop(res); continue; }
  else { const opp = mode==="readers" ? ["Cautious","Bluffer","Equilibrium"] : ["Cautious","Naive","Bluffer"];
    const foc = r%2 ? "Equilibrium" : "Info-hungry", seat = Math.floor(rnd()*4); types = opp.slice(); types.splice(seat,0,foc);
    const res = play(types); add("focal:"+foc, res[seat].net); add("focal:"+foc+"|paid", res[seat].paid); add("focal:"+foc+"|wins", res[seat].wins); continue; }
  for (const x of play(types)) { add(x.type, x.net); add(x.type+"|paid", x.paid); add(x.type+"|wins", x.wins); }
}
const summ = {}; for (const [k,v] of Object.entries(out)) summ[k] = [v.reduce((a,b)=>a+b,0), v.reduce((a,b)=>a+b*b,0), v.length];
console.log(JSON.stringify(summ));
`;
new Function("mode","N","console", body)(mode, N, console);

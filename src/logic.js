/* ---------- deck model (mirrors deck.py) ---------- */
const SUITS = ["Spades", "Clubs", "Hearts", "Diamonds"], SYM = ["\u2660\uFE0E", "\u2663\uFE0E", "\u2665\uFE0E", "\u2666\uFE0E"], RED = [false, false, true, true];
const POT = 200, GOAL_PAY = 10, START = 350, ANTE = 50, HAND = 10, NP = 4;
const KAPPA = [0.75, 0.64, 0.53, 0.49];               // live chips per accuracy point, answers 1 to 4
const READ = { true: [2.41, 1.34], false: [0.59, 0.81] }, POOLED = [1.03, 0.97];
let WINDOW_S = 60, TICKS = 60;   // Learning mode lengthens each window to 300 s, still one bot tick a second
const CONFIGS = [];
for (let L = 0; L < 4; L++) for (let S = 0; S < 4; S++) if (S !== L) {
  const c = [10, 10, 10, 10]; c[L] = 12; c[S] = 8; CONFIGS.push({ c, goal: L ^ 1, long: L });
}
const NC = CONFIGS.length;
const CMB = []; for (let n = 0; n <= 40; n++) { CMB[n] = [1]; for (let k = 1; k <= n; k++) CMB[n][k] = (CMB[n - 1][k - 1] || 0) + (CMB[n - 1][k] || 0); }
const comb = (n, k) => (k < 0 || k > n) ? 0 : CMB[n][k];
function mvh(c, v) { let p = 1, sc = 0, sv = 0; for (let s = 0; s < 4; s++) { if (v[s] > c[s]) return 0; p *= comb(c[s], v[s]); sc += c[s]; sv += v[s]; } return p / comb(sc, sv); }
const VECS = []; for (let a = 0; a <= HAND; a++) for (let b = 0; a + b <= HAND; b++) for (let c = 0; a + b + c <= HAND; c++) VECS.push([a, b, c, HAND - a - b - c]);
const key = v => v.join(",");
const handLik = h => CONFIGS.map(x => mvh(x.c, h));
const norm = w => { const t = w.reduce((a, b) => a + b, 0); return t > 0 ? w.map(x => x / t) : w.map(() => 1 / w.length); };
function goalProbs(w) { const n = norm(w), p = [0, 0, 0, 0]; n.forEach((x, i) => p[CONFIGS[i].goal] += x); return p; }
function voiPP(w, X) {
  const n = norm(w), before = [0, 0, 0, 0], yes = [0, 0, 0, 0], no = [0, 0, 0, 0];
  n.forEach((x, i) => { const g = CONFIGS[i].goal; before[g] += x; (CONFIGS[i].long === X ? yes : no)[g] += x; });
  return 100 * (Math.max(...yes) + Math.max(...no) - Math.max(...before));
}
// hand-only values and 3 equal-probability value bands (deck.band_means with K = 3, suit symmetric)
const HOV = {}; const HP = {};
for (const h of VECS) { const w = handLik(h); const t = w.reduce((a, b) => a + b, 0) / NC; if (t > 0) { HP[key(h)] = t; for (let X = 0; X < 4; X++) HOV[key(h) + "|" + X] = voiPP(w, X); } }
const BAND = (() => {
  const vals = Object.keys(HP).map(k => [HOV[k + "|0"], HP[k]]).sort((a, b) => a[0] - b[0]);
  const cuts = []; let acc = 0, ti = 0; const tg = [1 / 3, 2 / 3];
  for (const [v, p] of vals) { acc += p; while (ti < 2 && acc >= tg[ti]) { cuts.push(v); ti++; } }
  const s = [[0, 0], [0, 0], [0, 0]];
  for (const [v, p] of vals) { const b = cuts.filter(c => v > c + 1e-12).length; s[b][0] += p * v; s[b][1] += p; }
  return { cuts, means: s.map(x => x[0] / x[1]) };
})();
const bandOf = v => BAND.cuts.filter(c => v > c + 1e-12).length;
const BL = {};
function bandLik(hObs, X) {           // P(bidder's band | layout, observer's hand), shape [NC][3]
  const k = key(hObs) + "|" + X; if (BL[k]) return BL[k];
  const out = CONFIGS.map(({ c }) => {
    const rem = c.map((x, s) => x - hObs[s]), r = [0, 0, 0];
    if (Math.min(...rem) < 0) return r;
    for (const hb of VECS) { const p = mvh(rem, hb); if (p) r[bandOf(HOV[key(hb) + "|" + X] ?? 0)] += p; }
    return r;
  });
  return (BL[k] = out);
}
const rnd = () => Math.random();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- bots (mirror bots.py final settings) ---------- */
const TYPES = {
  Equilibrium: { decode: true, read: true, protect: true, mode: "bands", scale: 1.0, hs: 6, edge: 1, stTrust: 0.1, says: "none", fvBlend: 0.2 },
  "Info-hungry": { decode: true, read: true, protect: true, mode: "exact", scale: 1.5, hs: 6, edge: 1, stTrust: 0.2, says: "none", fvBlend: 0.3 },   // fvBlend: uses X-rayed hands in the bonus race (desk.js)
  Cautious: { decode: true, read: true, protect: true, mode: "min", scale: 1.0, hs: 6, edge: 1, stTrust: 0.1, says: "none" },
  Naive: { decode: false, read: false, protect: false, mode: "exact", scale: 1.0, hs: 1.5, edge: 1, stTrust: 0.5, says: "truth", fvBlend: 0.2 },
  Bluffer: { decode: true, read: true, protect: true, mode: "reversed", scale: 1.0, hs: 6, edge: 1, stTrust: 0, says: "lie", fvBlend: 0.2 },
};
class Bot {
  constructor(type, seat, hand) {
    Object.assign(this, TYPES[type]); this.type = type; this.seat = seat; this.hand = hand.slice(); this.init = hand.slice();
    this.w = handLik(hand); this.winners = new Set(); this.unknown = false; this.seen = new Set(); this.k = 0; this.fv = null;
  }
  bid(X, chips) {
    const v = voiPP(this.w, X), kap = KAPPA[this.k];
    let b;
    if (this.mode === "min") b = 1;
    else if (this.mode === "exact") b = kap * v * this.scale;
    else { let band = bandOf(v); if (this.mode === "reversed") band = 2 - band; b = kap * BAND.means[band] * this.scale; }
    return Math.min(Math.max(b, 1), chips);
  }
  observeBids(X, bids, winner) {
    if (winner !== null) this.winners.add(winner); else this.unknown = true;
    if (this.decode && bids) {
      const lik = bandLik(this.init, X), kap = KAPPA[this.k];
      bids.forEach((b, j) => { if (j === this.seat) return; let best = 0, bd = 1e9; BAND.means.forEach((m, i) => { const d = Math.abs(b - kap * m); if (d < bd) { bd = d; best = i; } }); this.w = this.w.map((x, i) => x * lik[i][best]); });
    }
    this.fv = null;
  }
  receiveAnswer(X, isLong) { this.w = this.w.map((x, i) => (CONFIGS[i].long === X) === isLong ? x : 0); this.fv = null; }
  hearStatement(speaker, X, claim) {
    if (speaker !== this.seat) this.winners.add(speaker);
    if (speaker === this.seat || this.stTrust <= 0) return;
    const t = this.stTrust; this.w = this.w.map((x, i) => x * ((CONFIGS[i].long === X) === claim ? (1 + t) / 2 : (1 - t) / 2)); this.fv = null;
  }
  statement(X, isLong) { return this.says === "truth" ? isLong : this.says === "lie" ? !isLong : null; }
  observeTrade(suit, buyer, seller, takerBuys) {
    if (this.seat === buyer) this.hand[suit]++; else if (this.seat === seller) this.hand[suit]--;
    else if (this.read) {
      const taker = takerBuys ? buyer : seller, k = [this.k, taker, suit, takerBuys].join(":");
      if (!this.seen.has(k)) {
        this.seen.add(k);
        const [fb, fs] = this.winners.has(taker) ? READ.true : this.unknown ? POOLED : READ.false;
        const f = takerBuys ? fb : 1 / fs; this.w = this.w.map((x, i) => CONFIGS[i].goal === suit ? x * f : x);
      }
    }
    this.fv = null;
  }
  fairValues() {
    if (this.fv) return this.fv;
    const n = norm(this.w), pg = goalProbs(this.w), gb = [0, 0, 0, 0], gs = [0, 0, 0, 0], M = 40;
    const cum = []; n.reduce((a, x, i) => (cum[i] = a + x), 0);
    for (let m = 0; m < M; m++) {
      const u = rnd(); let i = cum.findIndex(x => x >= u); if (i < 0) i = NC - 1;
      const { c, goal: g } = CONFIGS[i]; const rem = c.map((x, s) => x - this.hand[s]);
      if (Math.min(...rem) < 0) continue;
      const pool = shuffle(rem.flatMap((x, s) => Array(x).fill(s)));
      let st = 0, best = -1, nb = 0;
      for (let p = 0; p < NP; p++) { if (p === this.seat) continue; const k = G.sizes[p]; let cnt = 0; for (let q = st; q < st + k; q++) if (pool[q] === g) cnt++; st += k; if (cnt > best) { best = cnt; nb = 1; } else if (cnt === best) nb++; }
      const bonus = POT - GOAL_PAY * c[g], own = this.hand[g];
      const share = x => x > best ? 1 : x === best ? 1 / (1 + nb) : 0;
      gb[g] += bonus * (share(own + 1) - share(own)); if (own > 0) gs[g] += bonus * (share(own) - share(own - 1));
    }
    this.fv = { pg, buy: pg.map((p, s) => GOAL_PAY * p + gb[s] / M), sell: pg.map((p, s) => GOAL_PAY * p + gs[s] / M) };
    return this.fv;
  }
  quotes(taker) {
    let { pg, buy, sell } = this.fairValues();
    if (this.protect && this.winners.has(taker)) {      // quote a recent winner its post-trade value
      const [fb, fs] = READ.true; const nb = buy.slice(), ns = sell.slice();
      for (let s = 0; s < 4; s++) { if (pg[s] <= 0) continue;
        const pB = goalProbs(this.w.map((x, i) => CONFIGS[i].goal === s ? x * fb : x))[s];
        const pS = goalProbs(this.w.map((x, i) => CONFIGS[i].goal === s ? x / fs : x))[s];
        ns[s] = GOAL_PAY * pB + (sell[s] - GOAL_PAY * pg[s]) * pB / pg[s];
        nb[s] = GOAL_PAY * pS + (buy[s] - GOAL_PAY * pg[s]) * pS / pg[s]; }
      buy = nb; sell = ns;
    }
    const bids = buy.map(v => Math.max(v - this.hs, 0));
    const asks = sell.map((v, s) => this.hand[s] > 0 ? Math.max(v + this.hs, bids[s] + 0.5) : Infinity);
    return { bids, asks };
  }
  chooseTrade(book) {
    const { buy, sell } = this.fairValues(); let best = null;
    for (const { seat, bids, asks } of book) for (let s = 0; s < 4; s++) {
      const eb = buy[s] - asks[s]; if (eb > this.edge && (!best || eb > best.e)) best = { e: eb, side: "buy", s, seat, p: asks[s] };
      if (this.hand[s] > 0) { const es = bids[s] - sell[s]; if (es > this.edge && (!best || es > best.e)) best = { e: es, side: "sell", s, seat, p: bids[s] }; }
    }
    return best;
  }
}

/* ---------- game state ---------- */
const G = {};
const $ = id => document.getElementById(id);
const fmt = x => (Math.round(x * 10) / 10).toFixed(1);
const NAMES = ["You", "Bot A", "Bot B", "Bot C"];
function readCount() { try { return parseInt(localStorage.getItem("baf-games") || "0", 10) || 0; } catch (e) { return 0; } }
function writeCount(n) { try { localStorage.setItem("baf-games", String(n)); } catch (e) {} }

function newGame() {
  const ci = Math.floor(rnd() * NC), cfg = CONFIGS[ci];
  const deck = shuffle(cfg.c.flatMap((x, s) => Array(x).fill(s)));
  const hands = [0, 1, 2, 3].map(p => { const h = [0, 0, 0, 0]; deck.slice(p * HAND, (p + 1) * HAND).forEach(s => h[s]++); return h; });
  const types = shuffle(Object.keys(TYPES)).slice(0, 3);
  Object.assign(G, {
    ci, cfg, hands, types, k: 0, phase: "bid", chips: [300, 300, 300, 300],
    sizes: [10, 10, 10, 10], meW: handLik(hands[0]), log: [], tape: [], desk: [], myTrades: [], quoteLog: [], myQuotes: null,
    intel: [null, ...[1, 2, 3].map(() => ({ seen: [0, 0, 0, 0], hand: null }))], shown: [0, 1, 2, 3].map(() => ({})), tracker: false, spent: [0, 0, 0, 0],
    timer: null, ticksLeft: 0, gameNo: readCount() + 1, started: Date.now(), saved: null, hands0: hands[0].slice(),
  });
  G.bots = [null, ...types.map((t, i) => new Bot(t, i + 1, hands[i + 1]))];
  for (const b of G.bots.slice(1)) { b.k = 0; b.deskInit(); }
  render();
}

/* ---------- data desk ---------- */
const WNAME = ["Marlow", "Ines", "Hollis"];
const pName = p => p === 0 ? "You" : WNAME[p - 1];
/* mine = { peek: [unit bids], scan: {bid, target} | null, xray: {bid, target} | null, track: bid | null } */
function placeDesk(mine) {
  const hands = () => [G.hands[0], ...G.bots.slice(1).map(b => b.hand)];
  const bids = [mine, ...G.bots.slice(1).map(b => ({ ...b.deskBids(G.chips[b.seat]), track: null }))];
  const res = runDesk(bids), rec = { k: G.k, mine, res: {}, got: [], claims: [], buyers: [] };
  const buyers = new Set();
  for (const kind of ["peek", "scan", "xray", "track"]) {
    const R = res[kind], out = { price: R.price, wins: [] };
    for (const e of R.win) {
      if (G.chips[e.p] < R.price) continue;               // cannot pay: the lot goes unsold
      let r = null;
      if (kind !== "track") { r = revealCards(e.p, kind === "peek" ? null : e.target, WIDGETS[kind].cards, hands(), G.shown); if (!r) continue; }
      G.chips[e.p] -= R.price; G.spent[e.p] += R.price; buyers.add(e.p);
      out.wins.push({ p: e.p, target: kind === "peek" || kind === "track" ? null : e.target });
      if (kind === "track") { G.tracker = true; continue; }
      if (e.p === 0) {
        const I = G.intel[r.owner], seen0 = meSeen(), fresh = r.whole ? r.cards.map((x, s) => Math.max(x - I.seen[s], 0)) : r.cards;
        G.meW = G.meW.map((x, i) => x * mvh(CONFIGS[i].c.map((c, s) => Math.max(c - G.hands[0][s] - seen0[s], 0)), fresh));
        if (r.whole) { I.hand = r.cards.slice(); I.seen = r.cards.slice(); } else I.seen = I.seen.map((x, s) => x + r.cards[s]);
        rec.got.push({ kind, owner: r.owner, cards: r.cards, whole: r.whole });
      } else {
        G.bots[e.p].receiveCards(r.owner, r.cards, r.whole);
        if (kind === "peek") { const s = r.cards.findIndex(x => x > 0), cl = G.bots[e.p].cardClaim(s);
          if (cl !== null) { rec.claims.push({ p: e.p, s: cl }); for (const b of G.bots.slice(1)) b.hearCardClaim(e.p, cl); } }
      }
    }
    rec.res[kind] = out;
  }
  rec.buyers = [...buyers];
  for (const b of G.bots.slice(1)) b.observeDesk(rec.buyers);
  G.desk.push(rec);
  const parts = [];
  for (const kind of ["peek", "scan", "xray"]) { const o = rec.res[kind]; if (!o.wins.length) continue;
    const who = o.wins.map(w => pName(w.p) + (w.target != null ? ` on ${pName(w.target)}` : ""));
    parts.push(`${WIDGETS[kind].name} ${who.join(", ")} at ${fmt(o.price)}`); }
  G.log.push({ t: `Desk ${G.k + 1}: ${parts.length ? parts.join("; ") : "no lots sold"}.` });
  for (const g of rec.got) G.log.push({ me: true, t: `You saw ${g.whole ? "all of " : ""}${pName(g.owner)}'s ${cardList(g.cards)}.` });
  for (const c of rec.claims) G.log.push({ t: `${pName(c.p)} says the card it peeked was a ${SUITS[c.s].slice(0, -1)}.` });
  G.phase = "result"; render();
}
/* cards you have seen, summed over opponents (X-rayed hands count as their current cards) */
function meSeen() { const t = [0, 0, 0, 0]; for (const I of G.intel.slice(1)) (I.hand || I.seen).forEach((x, s) => t[s] += Math.max(x, 0)); return t; }
const cardList = v => v.map((n, s) => n ? `${n} ${SYM[s]}` : "").filter(Boolean).join(" ") || "nothing";

/* ---------- trading ---------- */
function startWindow() {
  G.phase = "trade"; G.ticksLeft = TICKS; G.myQuotes = { bids: [null, null, null, null], asks: [null, null, null, null] }; render();
  G.timer = setInterval(() => { tick(); if (--G.ticksLeft <= 0) endWindow(); else renderTrade(); }, (WINDOW_S * 1000) / TICKS);
}
function doTrade(s, buyer, seller, price, takerBuys) {
  G.chips[buyer] -= price; G.chips[seller] += price; G.sizes[buyer]++; G.sizes[seller]--;
  if (buyer === 0) G.hands[0][s]++; if (seller === 0) G.hands[0][s]--;
  for (const b of G.bots.slice(1)) { b.observeTrade(s, buyer, seller, takerBuys); b.trackTrade(s, buyer, seller); }
  for (const p of [buyer, seller]) { const I = p ? G.intel[p] : null; if (I && I.hand) { I.hand[s] += p === buyer ? 1 : -1; I.seen = I.hand.slice(); } }
  const starter = takerBuys ? buyer : seller;
  G.tape.unshift({ me: buyer === 0 || seller === 0, t: `W${G.k + 1}  ${NAMES[buyer]} bought ${SYM[s]} from ${NAMES[seller]} at ${fmt(price)} (${NAMES[starter]} started)` });
  if (G.tape.length > 80) G.tape.pop();
}
function tick() {
  const actor = 1 + Math.floor(rnd() * 3), b = G.bots[actor];
  const book = G.bots.slice(1).filter(o => o.seat !== actor).map(o => ({ seat: o.seat, ...o.quotes(actor) }));
  const mq = G.myQuotes;
  if (mq) book.push({ seat: 0,   // your posted prices, limited by your cards and chips
    bids: mq.bids.map(p => p !== null && G.chips[0] >= p ? p : -Infinity),
    asks: mq.asks.map((p, s) => p !== null && G.hands[0][s] > 0 ? p : Infinity) });
  const t = b.chooseTrade(book); if (!t) return;
  const [buyer, seller] = t.side === "buy" ? [actor, t.seat] : [t.seat, actor];
  if (t.seat === 0) G.myTrades.push({ k: G.k, s: t.s, side: t.side === "buy" ? "sell" : "buy", price: t.p, with: b.type, onMyQuote: true });
  doTrade(t.s, buyer, seller, t.p, t.side === "buy");
}
function humanTrade(s, side) {
  const q = bestQuotes()[s], pick = side === "buy" ? q.ask : q.bid;
  if (!pick || !isFinite(pick.p) || pick.p <= 0) return;
  if (side === "sell" && G.hands[0][s] <= 0) return;
  if (side === "buy" && G.chips[0] < pick.p) return;
  const [buyer, seller] = side === "buy" ? [0, pick.seat] : [pick.seat, 0];
  G.myTrades.push({ k: G.k, s, side, price: pick.p, with: G.bots[pick.seat].type });
  doTrade(s, buyer, seller, pick.p, side === "buy"); renderTrade(); renderSide();   // you are the taker: a buy or a sale
}
function bestQuotes() {
  const out = [0, 1, 2, 3].map(() => ({ bid: null, ask: null }));
  for (const b of G.bots.slice(1)) { const q = b.quotes(0);
    for (let s = 0; s < 4; s++) {
      if (!out[s].bid || q.bids[s] > out[s].bid.p) out[s].bid = { p: q.bids[s], seat: b.seat };
      if (isFinite(q.asks[s]) && (!out[s].ask || q.asks[s] < out[s].ask.p)) out[s].ask = { p: q.asks[s], seat: b.seat };
    } }
  return out;
}
function endWindow() {
  clearInterval(G.timer); G.timer = null;
  G.k++; for (const b of G.bots.slice(1)) b.k = G.k;
  if (G.k >= 4) finish(); else { G.phase = "bid"; render(); }
}

/* ---------- scoring and save ---------- */
function finish() {
  const g = G.cfg.goal, hands = [G.hands[0], ...G.bots.slice(1).map(b => b.hand)];
  const n = hands.map(h => h[g]), top = Math.max(...n), win = n.map((x, i) => x === top ? i : -1).filter(i => i >= 0);
  const bonus = POT - GOAL_PAY * G.cfg.c[g];
  const pay = n.map((x, i) => GOAL_PAY * x + (win.includes(i) ? bonus / win.length : 0));
  G.result = { goalCounts: n, pay, net: G.chips.map((c, i) => c + pay[i] - START) };
  G.phase = "end"; writeCount(G.gameNo); render(); save();
}
async function save() {
  const rec = {
    rules: "v4 data desk", gameNo: G.gameNo, startedAt: new Date(G.started).toISOString(),
    durationSec: Math.round((Date.now() - G.started) / 1000), layout: G.cfg.c, goal: G.cfg.goal, longSuit: G.cfg.long,
    botTypes: G.types, startHand: G.hands0, desk: G.desk, spent: G.spent, tracker: G.tracker, myTrades: G.myTrades, quoteLog: G.quoteLog, version: 4,
    mode: G.mode || "standard",
    goalCounts: G.result.goalCounts, net: G.result.net, myNet: G.result.net[0],
  };
  G.saved = "saving";
  try {
    const db = await window.claude?.use?.("db"), user = await window.claude?.use?.("user");
    const id = user ? await user.id() : null;
    if (!db || !id) { G.saved = "off"; renderSave(); return; }
    const gid = `g${Date.now()}`;
    await db.doc(`games/${id}/rounds/${gid}`).set(rec);
    await db.doc(`games/${id}`).set({ lastPlayedAt: new Date().toISOString(), lastGame: gid, gamesThisBrowser: G.gameNo });
    G.saved = "ok";
  } catch (e) { G.saved = "fail"; }
  renderSave();
}


/* ---------- data desk (rules v4): widgets auctioned each window, payments go to the house ----------
   Peek: 1 random card from a random opponent, never one already shown to you (several lots, uniform price).
   Scan: 5 random cards from an opponent you choose (1 lot, second price).
   X-ray: an opponent's whole hand, then tracked through the public tape (2 lots, uniform price).
   Tracker: a live position grid for the human; bots already track the tape, so they never bid on it.
   Every lot has a house reserve. Winners and prices are public; what a winner saw is not. */
const WIDGETS = {
  peek: { name: "Peek", cards: 1, lots: 2, reserve: 0.5, choose: false },
  scan: { name: "Scan", cards: 5, lots: 1, reserve: 1.5, choose: true },
  xray: { name: "X-ray", cards: 10, lots: 2, reserve: 3, choose: true },
  track: { name: "Tracker", cards: 0, lots: 1, reserve: 5, choose: false },
};
// winnerRead: how much a buyer's trades are read as informed, against an old answer winner (1).
// bidScale: bots bid this share of the nominal value. 1.0 since V19: once X-rayed hands stopped being
// peeked again, data was underpriced at 0.5 and the heaviest buyer won a large edge (+11 a round).
// fvBlend (per style, in TYPES) mixes in a fair value that holds X-rayed hands fixed. At full weight
// the static estimate overstates the majority race and the heaviest X-ray buyer loses badly in trading
// and payout (series run: Info-hungry -18.9 a round), so bots use it at 0.2 to 0.3.
let DESK = { winnerRead: 0.5, mcN: 48, bidScale: 1.0 };
READ.true = [1 + (READ.true[0] - 1) * DESK.winnerRead, 1 + (READ.true[1] - 1) * DESK.winnerRead];

// Layout likelihood of seeing suit counts v among cards drawn from what this bot cannot see.
function seenOf(bot) { const t = [0, 0, 0, 0]; for (const v of Object.values(bot.shownFrom)) v.forEach((x, s) => t[s] += Math.max(x, 0)); return t; }
function unseenOf(bot) { const sn = seenOf(bot); return CONFIGS.map(({ c }) => c.map((x, s) => Math.max(x - bot.hand[s] - sn[s], 0))); }
function drawLik(bot, v) { const U = unseenOf(bot); return U.map(u => mvh(u, v)); }

// Accuracy points (x100 on the best-guess goal probability) from seeing n more unseen cards.
function voiCards(bot, n) {
  const w = norm(bot.w), base = Math.max(...goalProbs(w)), U = unseenOf(bot), cum = [];
  w.reduce((a, x, i) => (cum[i] = a + x), 0);
  const draw = (W, UU) => [0, 1, 2, 3].map(s => W.map((x, i) => { const t = UU[i].reduce((a, b) => a + b, 0); return t ? x * UU[i][s] / t : 0; }));
  if (n === 1 || n === 2) {                        // exact for one or two cards (two: every ordered pair of suits)
    let after = 0;
    draw(w, U).forEach((w1, s) => {
      const p1 = w1.reduce((a, b) => a + b, 0); if (p1 <= 0) return;
      if (n === 1) { after += p1 * Math.max(...goalProbs(w1)); return; }
      const U2 = U.map(u => u.map((x, r) => r === s ? Math.max(x - 1, 0) : x));
      draw(w1, U2).forEach(w2 => { const p2 = w2.reduce((a, b) => a + b, 0); if (p2 > 0) after += p2 * Math.max(...goalProbs(w2)); });
    });
    return 100 * (after - base);
  }
  let after = 0;
  for (let m = 0; m < DESK.mcN; m++) {           // sample a layout, then n cards from its unseen pool
    const u = rnd(); let i = cum.findIndex(x => x >= u); if (i < 0) i = NC - 1;
    const pool = shuffle(U[i].flatMap((x, s) => Array(x).fill(s))).slice(0, n), v = [0, 0, 0, 0]; pool.forEach(s => v[s]++);
    const L = U.map(uu => mvh(uu, v)); after += Math.max(...goalProbs(w.map((x, j) => x * L[j])));
  }
  return 100 * (after / DESK.mcN - base);
}

Object.assign(Bot.prototype, {
  deskInit() { this.shownFrom = {}; this.known = {}; },
  // bids per widget: { peek: [unit bids], scan: {bid, target}, xray: {bid, target} }
  deskBids(chips) {
    const out = { peek: [], scan: null, xray: null };
    if (this.mode === "min") return out;
    const kap = KAPPA[this.k] * DESK.bidScale * (this.deskScale || 1), val = n => kap * Math.max(voiCards(this, n), 0) * this.scale;
    const v1 = val(1); if (v1 >= WIDGETS.peek.reserve) out.peek.push(Math.min(v1, chips / 4));
    if (v1 >= WIDGETS.peek.reserve) { const v2 = val(2) - v1; if (v2 >= WIDGETS.peek.reserve) out.peek.push(Math.min(v2, chips / 4)); }
    const opp = [0, 1, 2, 3].filter(p => p !== this.seat && !this.known[p]);
    if (opp.length) {
      const target = opp[Math.floor(rnd() * opp.length)];
      const vs = val(5), vx = val(10);
      if (vs >= WIDGETS.scan.reserve) out.scan = { bid: Math.min(vs, chips / 3), target };
      if (vx >= WIDGETS.xray.reserve) out.xray = { bid: Math.min(vx, chips / 3), target };
    }
    return out;
  },
  receiveCards(owner, cards, whole) {             // cards: suit counts revealed (a peek or scan never repeats one)
    const prior = this.shownFrom[owner] || [0, 0, 0, 0];
    const fresh = whole ? cards.map((x, s) => Math.max(x - prior[s], 0)) : cards;
    const L = drawLik(this, fresh); this.w = this.w.map((x, i) => x * L[i]);
    this.shownFrom[owner] = whole ? cards.slice() : prior.map((x, s) => x + cards[s]);
    if (whole) this.known[owner] = cards.slice();
    this.fv = null;
  },
  observeDesk(buyers) { buyers.forEach(p => { if (p !== this.seat) this.winners.add(p); }); this.fv = null; },
  cardClaim(s) { return this.says === "truth" ? s : this.says === "lie" ? (s + 1 + Math.floor(rnd() * 3)) % 4 : null; },
  hearCardClaim(speaker, s) {
    if (speaker === this.seat || this.stTrust <= 0) return;
    const U = unseenOf(this), t = this.stTrust;
    this.w = this.w.map((x, i) => { const tot = U[i].reduce((a, b) => a + b, 0); return x * ((1 - t) + t * 4 * (tot ? U[i][s] / tot : 0.25)); });
    this.fv = null;
  },
  trackTrade(suit, buyer, seller) {               // keep X-rayed hands exact through the public tape
    if (this.known[buyer]) { this.known[buyer][suit]++; this.shownFrom[buyer] = this.known[buyer].slice(); }
    if (this.known[seller]) { this.known[seller][suit]--; this.shownFrom[seller] = this.known[seller].slice(); }
  },
});

// Each widget is its own sealed auction. Several identical lots clear at one price: the highest losing
// unit bid, or the reserve if higher. A single lot is second price. Ties break at random.
function clearLots(entries, lots, reserve) {
  const ok = entries.filter(e => e.b >= reserve).map(e => ({ ...e, r: rnd() })).sort((a, b) => b.b - a.b || a.r - b.r);
  const win = ok.slice(0, lots), lose = ok[lots];
  return { win, price: Math.max(reserve, lose ? lose.b : 0) };
}
function runDesk(bids) {   // bids[p] = { peek:[...], scan:{bid,target}|null, xray:{...}|null, track:bid|null }
  const res = {};
  res.peek = clearLots(bids.flatMap((b, p) => b.peek.map(x => ({ p, b: x }))), WIDGETS.peek.lots, WIDGETS.peek.reserve);
  for (const k of ["scan", "xray"]) res[k] = clearLots(bids.map((b, p) => b[k] ? { p, b: b[k].bid, target: b[k].target } : null).filter(Boolean), 1, WIDGETS[k].reserve);
  res.track = clearLots(bids.map((b, p) => b.track ? { p, b: b.track } : null).filter(Boolean), 1, WIDGETS.track.reserve);
  return res;
}
// Cards revealed to a buyer. shown[buyer][owner] = counts already shown, so a peek never repeats one;
// shown[buyer]["x" + owner] marks an X-rayed hand, which later peeks and scans skip.
function revealCards(buyer, owner, n, hands, shown) {
  const pool = [];
  const owners = owner === null ? [0, 1, 2, 3].filter(p => p !== buyer) : [owner];
  for (const p of owners) for (let s = 0; s < 4; s++) {
    if (n < 10 && shown[buyer]["x" + p]) continue;   // an X-rayed hand holds nothing new for this buyer
    const free = n >= 10 ? hands[p][s] : hands[p][s] - ((shown[buyer][p] || [])[s] || 0);
    for (let q = 0; q < free; q++) pool.push([p, s]);
  }
  if (!pool.length) return null;
  if (n >= 10) { shown[buyer]["x" + owner] = true; return { owner, cards: hands[owner].slice(), whole: true }; }
  const pick = shuffle(pool).slice(0, n), o = owner === null ? pick[0][0] : owner, v = [0, 0, 0, 0];
  if (owner === null) pick.length = 1;
  pick.forEach(([, s]) => v[s]++);
  shown[buyer][o] = (shown[buyer][o] || [0, 0, 0, 0]).map((x, s) => x + v[s]);
  return { owner: o, cards: v, whole: false };
}

// Fair values with X-rayed hands held fixed: only the unknown opponents' cards are sampled.

// Optional per-style use of X-rayed hands in fair values (TYPES[t].fvBlend, 0 = off). The known-hand
// estimate treats the race for the majority as static, which overstates it, so it is mixed with the
// ordinary estimate at weight fvBlend.
const fairValuesBase = Bot.prototype.fairValues;
Bot.prototype.fairValues = function () {
  const blend = this.fvBlend || 0;
  if (!blend || !this.known || !Object.keys(this.known).length) return fairValuesBase.call(this);
  if (this.fv) return this.fv;
  const base = fairValuesBase.call(this); this.fv = null;
  const n = norm(this.w), pg = goalProbs(this.w), gb = [0, 0, 0, 0], gs = [0, 0, 0, 0], M = 120;
  const cum = []; n.reduce((a, x, i) => (cum[i] = a + x), 0);
  const kn = this.known; let used = 0;
  for (let m = 0; m < M; m++) {
    const u = rnd(); let i = cum.findIndex(x => x >= u); if (i < 0) i = NC - 1;
    const { c, goal: g } = CONFIGS[i];
    const rem = c.map((x, s) => x - this.hand[s] - Object.values(kn).reduce((a, h) => a + h[s], 0));
    if (Math.min(...rem) < 0) continue;
    const pool = shuffle(rem.flatMap((x, s) => Array(x).fill(s)));
    let st = 0, best = -1, nb = 0;
    for (let p = 0; p < NP; p++) {
      if (p === this.seat) continue;
      let cnt;
      if (kn[p]) cnt = kn[p][g];
      else { const k = G.sizes[p]; cnt = 0; for (let q = st; q < st + k; q++) if (pool[q] === g) cnt++; st += k; }
      if (cnt > best) { best = cnt; nb = 1; } else if (cnt === best) nb++;
    }
    const bonus = POT - GOAL_PAY * c[g], own = this.hand[g];
    const share = x => x > best ? 1 : x === best ? 1 / (1 + nb) : 0;
    gb[g] += bonus * (share(own + 1) - share(own)); if (own > 0) gs[g] += bonus * (share(own) - share(own - 1));
    used++;
  }
  const D = Math.max(used, 1), kb = pg.map((p, s) => GOAL_PAY * p + gb[s] / D), ks = pg.map((p, s) => GOAL_PAY * p + gs[s] / D);
  this.fv = { pg, buy: base.buy.map((x, s) => (1 - blend) * x + blend * kb[s]), sell: base.sell.map((x, s) => (1 - blend) * x + blend * ks[s]) };
  return this.fv;
};

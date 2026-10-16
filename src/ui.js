/* ---------- interface (card room, after the audit) ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const HREF = ["#spade", "#club", "#heart", "#diamond"];
const ONE = ["Spade", "Club", "Heart", "Diamond"];
const PN = ["You", "Marlow", "Ines", "Hollis"];
const DISC = ["You", "M", "I", "H"];
const TYPE_LINE = {
  Equilibrium: ["played it straight", "Bid by its read of the cards and kept quiet."],
  "Info-hungry": ["was Info-hungry", "Paid up to half again for data and used X-rayed hands in the race for the bonus."],
  Cautious: ["was Cautious", "Never bought data."],
  Naive: ["was Naive", "Believed every claim and told the truth about its peeks."],
  Bluffer: ["was the Bluffer", "Lied about the cards it peeked."],
};
const REDUCED = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } })();
const narrow = () => { try { return matchMedia("(max-width: 900px)").matches; } catch (e) { return false; } };
const U = { view: "start", lastChips: 300, timers: [], bidText: "10", sealing: false, dealing: false, msg: ["", "", "", ""], act: ["", "", "", ""], trades: [],
  mode: "standard",   // standard (4 x 60 s) | open (Learning, hands shown) | hidden (Learning, hands hidden)
  hist: [], hist0: null, review: null, cmd: null, sess: null, cleared: 0, desk: null };
const MODES = { standard: ["Standard", "4 minutes"], open: ["Learning, open hands", "20 minutes"], hidden: ["Learning, hidden hands", "20 minutes"] };
const TICK = 0.1;   // one tick: the smallest price step
/* whole numbers stay whole; one decimal only where a fraction exists */
const nf = x => { const r = Math.round(x * 10) / 10; return Number.isInteger(r) ? String(Math.abs(r) === 0 ? 0 : r) : r.toFixed(1); };
const sv = (s, cls = "") => `<svg class="suit ${cls}" aria-hidden="true"><use href="${HREF[s]}"/></svg>`;
const disc = (p, sm = true) => `<span class="disc${sm ? " sm" : ""}${p === 0 ? " you" : " d" + p}" aria-hidden="true">${DISC[p]}</span>`;
const later = (ms, fn) => U.timers.push(setTimeout(fn, ms));
const clearLater = () => { U.timers.forEach(clearTimeout); U.timers = []; };
const cnt = (n, s) => `${n} ${n === 1 ? ONE[s] : SUITS[s]}`;
const signed = x => `${x >= 0 ? "+" : "−"}${nf(Math.abs(x))}`;
/* Schibsted widens the full stop under tabular figures, so the point is set apart in its own proportional run */
const nh = x => nf(x).replace(".", '<span class="dp">.</span>');
const sh = x => signed(x).replace(".", '<span class="dp">.</span>');

/* ---------- table ---------- */
function fanHTML(n, spread) {
  let o = ""; for (let i = 0; i < n; i++) o += `<i class="bk" style="transform:rotate(${((i - (n - 1) / 2) * spread).toFixed(1)}deg)"></i>`; return o;
}
function seatHTML(p) {
  let note = `<span class="n">${G.sizes[p]} cards</span>`;
  if (G.phase === "end" && G.result) note = `<span class="got">${signed(G.result.pay[p])}</span>`;
  else if (U.view === "start") note = `<span class="n">300 chips</span>`;
  return `${disc(p, false)}${p ? `<b>${PN[p]}</b>` : U.prof && U.prof.name ? `<b>${esc(U.prof.name)}</b>` : ""}${note}<span class="act">${U.view === "start" || G.phase === "end" ? "" : U.act[p]}</span>`;
}
function tilesHTML(h, opts = {}) {
  return h.map((n, s) => {
    const g = opts.goal != null ? (s === opts.goal ? " goal" : " dim") : "";
    return `<li class="st ${RED[s] ? "red" : "blk"}${n === 0 ? " zero" : ""}${g}" id="${opts.idp || "c"}${s}" aria-label="${cnt(n, s)}">${sv(s)}<b aria-hidden="true">${n}</b></li>`;
  }).join("");
}
function potHTML() {
  const st = (x, k, c) => `<div class="stack" style="left:${x}px">${Array.from({ length: k }, (_, i) => `<svg style="bottom:${i * 5}px"><use href="#chip${c}"/></svg>`).join("")}</div>`;
  return `<div class="chips" aria-hidden="true">${st(8, 5, "Ox")}${st(53, 7, "Iv")}${st(98, 3, "Ox")}</div><p class="lab disp">Pot 200</p>`;
}
function renderTable() {
  const T = $("table"), start = U.view === "start", trade = G.phase === "trade" && !start;
  let inner = `<div class="felt"></div>`;
  if (trade) inner += `<svg class="rimclock" id="rim" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse class="bg" cx="50" cy="50" rx="50" ry="50"/><ellipse class="fg" id="rimfg" cx="50" cy="50" rx="50" ry="50" pathLength="100" stroke-dasharray="100" transform="rotate(-90 50 50)"/></svg><i class="stripclock" id="strip" aria-hidden="true"><b id="stripb"></b></i>`;
  if (!start && G.phase !== "end" && G.mode !== "open") for (const p of [1, 2, 3]) inner += `<div class="fan f${p}" id="fan${p}" aria-hidden="true">${fanHTML(G.sizes[p], p === 2 ? 8 : 6)}</div>`;
  for (const p of [1, 2, 3, 0]) inner += `<p class="seat s${p}${p === 0 ? " me" : ""}" id="seat${p}">${seatHTML(p)}</p>`;
  if (start) {
    inner += `<div class="mid"><div class="deck" aria-hidden="true"><i class="cardback"></i><i class="cardback"></i><i class="cardback"></i><i class="cardback" id="deckTop"></i></div><p class="line1">Four windows, one data desk, one goal suit.</p></div>`;
  } else if (G.phase === "end" && G.result) {
    const g = G.cfg.goal, L = G.cfg.long, rv = reviewStep();
    if (rv) inner += `<div class="reveal"><p class="rvstep" aria-live="polite">${rv.label}</p></div>`;
    else inner += `<div class="reveal"><ul class="pair" aria-hidden="true"><li class="st ${RED[L] ? "red" : "blk"}">${sv(L)}<b>12</b></li>
        <li><svg width="44" height="16" viewBox="0 0 48 16" style="color:var(--chalk2)"><path d="M0 8h44M37 2l7 6-7 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></li>
        <li class="st ${RED[g] ? "red" : "blk"} goal">${sv(g)}<b>${G.cfg.c[g]}</b></li></ul>
      <h2 class="disp">${SUITS[L]} had 12, so ${SUITS[g]} is the goal suit.</h2></div>`;
  } else {
    inner += `<div class="mid${trade ? " trading" : ""}">${potHTML()}${trade ? `<p class="clk" id="clk" role="timer"></p><ul class="tape desk-only" id="tlT" aria-live="polite"></ul>` : ""}</div>`;
  }
  T.innerHTML = inner;
  const H = $("handzone"), slots = `<ol class="slots desk-only" aria-label="What you know">${slotsHTML()}</ol>`;
  if (start) H.innerHTML = "";
  else if (G.phase === "end" && G.result) {
    const rv = reviewStep(), hands = rv ? rv.hands : [G.hands[0], ...G.bots.slice(1).map(b => b.hand)];
    H.innerHTML = `<div class="yours">${slots}<ul class="hand" aria-label="Your hand: ${hands[0].map(cnt).join(", ")}">${tilesHTML(hands[0], { goal: G.cfg.goal, idp: "e0" })}</ul></div>
      <div class="hands-up">${[1, 2, 3].map(p => `<figure class="hu${p}"><figcaption>${PN[p]}</figcaption><ul aria-label="${PN[p]}: ${hands[p].map(cnt).join(", ")}">${tilesHTML(hands[p], { goal: G.cfg.goal, idp: "e" + p })}</ul></figure>`).join("")}</div>`;
  } else H.innerHTML = `<div class="yours">${slots}<ul class="hand" id="hand" aria-label="Your hand, ${G.sizes[0]} cards">${tilesHTML(G.hands[0])}</ul></div>${G.mode === "open" ? `<div class="hands-up live" id="openHands">${openHandsHTML()}</div>` : ""}`;
  if (trade) updateClock();
}
/* Learning mode, open hands: every bot's hand face up, live */
function openHandsHTML() {
  return [1, 2, 3].map(p => `<figure class="hu${p}"><figcaption>${PN[p]}</figcaption><ul aria-label="${PN[p]}: ${G.bots[p].hand.map(cnt).join(", ")}">${tilesHTML(G.bots[p].hand, { idp: "o" + p })}</ul></figure>`).join("");
}
/* the step chosen in Review the round: -1 is the deal, i is after trade i */
function reviewStep() {
  if (G.phase !== "end" || U.review == null || !U.hist0) return null;
  if (U.review === -1) return { hands: U.hist0.hands, label: "As dealt, before any trade" };
  const h = U.hist[U.review]; if (!h) return null;
  return { hands: h.hands, label: `After trade ${U.review + 1} of ${U.hist.length}: ${tradeText(h)}` };
}
function tradeText(t) {
  return t.seller === 0 ? `You sold a ${ONE[t.s]} to ${PN[t.buyer]} at ${nf(t.price)}` : t.buyer === 0 ? `You bought a ${ONE[t.s]} from ${PN[t.seller]} at ${nf(t.price)}` : `${PN[t.seller]} sold a ${ONE[t.s]} to ${PN[t.buyer]} at ${nf(t.price)}`;
}
const clock = t => { const sec = Math.round((TICKS - t.at) * WINDOW_S / TICKS); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; };
function updateClock() {
  const secs = Math.ceil(G.ticksLeft * WINDOW_S / TICKS), f = Math.max(0, G.ticksLeft / TICKS), low = secs <= 10;
  const fg = $("rimfg"); if (fg) fg.style.strokeDashoffset = (100 * (1 - f)).toFixed(2);
  const rim = $("rim"); if (rim) rim.classList.toggle("low", low);
  const sb = $("stripb"); if (sb) sb.style.transform = `scaleX(${f.toFixed(3)})`;
  const st = $("strip"); if (st) st.classList.toggle("low", low);
  const c = $("clk"); if (c) { c.innerHTML = `<b>${secs}</b> s left`; c.classList.toggle("low", low); c.setAttribute("aria-label", `${secs} seconds left to trade`); }
}
function updateSeats() {
  for (const p of [0, 1, 2, 3]) { const el = $("seat" + p); if (el) el.innerHTML = seatHTML(p); }
  for (const p of [1, 2, 3]) { const f = $("fan" + p); if (f && G.phase !== "end") f.innerHTML = fanHTML(G.sizes[p], p === 2 ? 8 : 6); }
  const H = $("hand"); if (H) { H.innerHTML = tilesHTML(G.hands[0]); H.setAttribute("aria-label", `Your hand, ${G.sizes[0]} cards`); }
  const O = $("openHands"); if (O) O.innerHTML = openHandsHTML();
}
function centre(el, r) { const b = el.getBoundingClientRect(); return b.width ? [b.left + b.width / 2 - r.left, b.top + b.height / 2 - r.top] : null; }
function flyCard(s, from, to) {
  if (REDUCED) return;
  const T = $("table"); if (!T) return;
  const r = T.getBoundingClientRect(), pt = p => centre($("seat" + p), r) || (p === 0 && $("hand") ? centre($("hand"), r) : null);
  const a = pt(from), b = pt(to); if (!a || !b) return;
  const [x0, y0] = a, [x1, y1] = b;
  const el = document.createElement("div"); el.className = `fly ${RED[s] ? "red" : "blk"}`; el.setAttribute("aria-hidden", "true");
  el.innerHTML = sv(s); T.appendChild(el);
  const an = el.animate([{ transform: `translate(${x0}px,${y0}px) rotate(-20deg) scale(.85)`, opacity: 0 }, { opacity: 1, offset: .12 },
    { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 30}px) rotate(-6deg) scale(1.05)`, offset: .5 },
    { transform: `translate(${x1}px,${y1}px) rotate(4deg) scale(.9)`, opacity: 1 }], { duration: 700, easing: "cubic-bezier(.3,.6,.25,1)" });
  an.onfinish = () => { el.remove(); const st = $("seat" + to); if (st) { st.classList.remove("recv"); void st.offsetWidth; st.classList.add("recv"); } };
}
function flyDeal(done) {
  const T = $("table"), top = $("deckTop");
  if (REDUCED || narrow() || !T || !top || !top.getBoundingClientRect().width) { done(); return; }
  const r = T.getBoundingClientRect(), [x0, y0] = centre(top, r);
  const order = [1, 2, 3, 0]; let left = 20; U.dealAnims = []; U.dealing = true;
  for (let i = 0; i < 20; i++) {
    const p = order[i % 4], [sx, sy] = centre($("seat" + p), r);
    const x1 = sx, y1 = sy + (p === 2 ? 40 : p === 0 ? -50 : 0);
    const el = document.createElement("div"); el.className = "fly back b" + p; el.setAttribute("aria-hidden", "true"); el.style.opacity = 0; T.appendChild(el);
    const an = el.animate([{ transform: `translate(${x0}px,${y0}px)`, opacity: 1 }, { transform: `translate(${x1}px,${y1}px) rotate(${p === 1 ? 90 : p === 3 ? -90 : 0}deg) scale(.7)`, opacity: 1 }],
      { duration: 300, delay: i * 24, easing: "cubic-bezier(.3,.6,.25,1)", fill: "forwards" });
    U.dealAnims.push(an);
    an.onfinish = () => { el.remove(); if (--left === 0) { U.dealing = false; done(); } };
  }
}
function skipDeal() { (U.dealAnims || []).forEach(a => { try { a.finish(); } catch (e) {} }); }

/* ---------- what you know: the cards the desk has shown you ---------- */
const miniCounts = v => v.some(x => x > 0) ? v.map((n, s) => n ? `<span class="mc ${RED[s] ? "red" : ""}">${sv(s)}<b>${n}</b></span>` : "").join("") : "";
const countsText = v => v.map((n, s) => n ? `${n} ${n === 1 ? ONE[s] : SUITS[s]}` : "").filter(Boolean).join(", ") || "nothing";
function intelOf(p) {
  const I = G.intel && G.intel[p]; if (!I) return { kind: "none", v: [0, 0, 0, 0] };
  if (I.hand) return { kind: "xray", v: I.hand };
  return I.seen.some(x => x > 0) ? { kind: "seen", v: I.seen } : { kind: "none", v: I.seen };
}
function knowHTML() {
  if (!G.desk || !G.desk.length) return `<p class="empty-know">Nothing yet. The data desk opens before each window.</p>`;
  const opp = [1, 2, 3].map(p => { const I = intelOf(p);
    const body = I.kind === "xray" ? `<p class="line">Whole hand, kept current</p><p class="mcs">${miniCounts(I.v)}</p>`
      : I.kind === "seen" ? `<p class="line">Seen so far</p><p class="mcs">${miniCounts(I.v)}</p><p>Cards may have moved since.</p>` : `<p>Nothing seen.</p>`;
    return `<article class="env intel"><p class="tag">${disc(p)} ${PN[p]}</p><div class="body">${body}</div></article>`; }).join("");
  const log = G.desk.map(r => `<li><b>Desk ${r.k + 1}</b> ${deskLine(r)}</li>`).join("");
  return `<div class="envs">${opp}</div><ul class="desklog">${log}</ul>`;
}
/* one line for a desk: who bought what, and the prices */
function deskLine(r) {
  const parts = [];
  for (const k of ["peek", "scan", "xray", "track"]) { const o = r.res[k]; if (!o || !o.wins.length) continue;
    const who = o.wins.map(w => `${PN[w.p]}${w.target != null ? ` on ${w.target ? PN[w.target] : "you"}` : ""}`);
    parts.push(`${WIDGETS[k].name}: ${who.join(", ")} at ${nf(o.price)}`); }
  return parts.length ? parts.join(". ") + "." : "Nothing sold.";
}
/* beside your hand: one slip per opponent with what you have seen */
function slotsHTML() {
  return [1, 2, 3].map(p => {
    const I = intelOf(p);
    if (I.kind === "none") return `<li class="slot open" aria-label="${PN[p]}: nothing seen">${disc(p)}</li>`;
    const full = I.kind === "xray" ? `${PN[p]} holds ${countsText(I.v)}. Kept current through the tape.` : `You have seen ${countsText(I.v)} from ${PN[p]}. Cards may have moved since.`;
    return `<li class="slot${I.kind === "xray" ? " xr" : ""}" tabindex="0" aria-label="${full}"><div aria-hidden="true"><p class="a">${disc(p)}${PN[p]}<span class="k">${I.kind === "xray" ? "Live" : "Seen"}</span></p><p class="b mcs">${miniCounts(I.v)}</p></div><span class="pop" aria-hidden="true">${full}</span></li>`;
  }).join("");
}
function renderKnow() {
  const h = knowHTML(); $("knowBody").innerHTML = h; $("drawerBody").innerHTML = h;
  const n = [1, 2, 3].filter(p => intelOf(p).kind !== "none").length;
  $("drawerSum").textContent = `What you know (${n} of 3 seen)`;
}

/* ---------- header ---------- */
function progHTML() {
  if (U.view === "start") return "";
  return `<ol class="prog" aria-label="Windows">${[0, 1, 2, 3].map(i => {
    const st = G.phase === "end" || i < G.k ? "done" : i === G.k ? "now" : "";
    return `<li class="${st} wn"${st === "now" ? ' aria-current="step"' : ""}><b aria-hidden="true">${i + 1}</b><span class="sr">Window ${i + 1}${st === "done" ? ", done" : ""}</span></li>`;
  }).join("")}</ol>`;
}
function renderBar() {
  const t = U.view === "start" ? "Blind Auction Figgie" : G.phase === "ante" ? "Your hand" : G.phase === "bid" ? `Data desk ${G.k + 1} of 4` : G.phase === "result" ? `Desk ${G.k + 1} results` : G.phase === "trade" ? `Trading, window ${G.k + 1}` : "End of round";
  $("ttl").innerHTML = `<h1 class="disp">${t}</h1>${progHTML()}`;
  renderChips();
}
function renderChips() {
  const c = G.phase === "end" && G.result ? G.chips[0] + G.result.pay[0] : G.chips[0];
  const el = $("st-chips"); el.innerHTML = nh(c);
  el.className = c > U.lastChips + 1e-9 ? "up" : c < U.lastChips - 1e-9 ? "" : el.className;
  U.lastChips = c;
}

/* ---------- panel: start ---------- */
function startPanel() {
  const modes = Object.entries(MODES).map(([k, [name, len]]) => `<button class="mode" data-mode="${k}" aria-pressed="${U.mode === k}"><b>${name}</b><span>${len}</span></button>`).join("");
  return `<h2 class="disp">Take a seat</h2>
  <div class="modes" role="group" aria-label="Game mode">${modes}</div>
  <button class="btn" id="deal">Deal a round</button>
  <div class="links"><button class="link" id="openRules">Rules</button><button class="link" id="openKeys">Helper keys</button><button class="link" id="openSaved">Saved games</button></div>`;
}

/* ---------- panel: the ante, and a first look at your hand ---------- */
function antePanel() {
  return `<div class="col"><h2 class="disp">The ante</h2></div>
  <div class="col"><dl class="ante paper"><dt>Your bank</dt><dd>350</dd><dt>Ante</dt><dd>−50</dd><dt>You start with</dt><dd><b>300</b></dd><dt>The pot</dt><dd>200</dd></dl></div>
  <div class="col"><button class="btn" id="toAuction">Open the data desk</button></div>`;
}

/* ---------- panel: the data desk ----------
   Four widgets, each its own sealed auction with a house reserve. You pay the clearing price,
   never more than your bid, and the money goes to the house. */
const WDESC = {
  peek: "One random card from a random opponent. Never one you have seen.",
  scan: "Five random cards from the opponent you pick.",
  xray: "The whole hand of the opponent you pick, kept current as they trade.",
  track: "A live grid of every player's buys and sells, for the rest of the round.",
};
function deskReset() { U.desk = { peek: "", peekN: 1, scan: "", scanT: null, xray: "", xrayT: null, track: false }; U.sealing = false; }
function deskTargets(kind) { return [1, 2, 3].filter(p => !(G.intel[p] && G.intel[p].hand)); }
function deskPanel() {
  const D = U.desk, W = WIDGETS;
  const inp = (k) => `<div class="wbid"><label class="sr" for="wb-${k}">Your ${W[k].name} bid</label><input id="wb-${k}" class="paper" inputmode="decimal" autocomplete="off" placeholder="No bid" value="${esc(D[k])}" data-desk="${k}" aria-describedby="we-${k}"></div>`;
  const tgt = (k) => `<div class="tg" role="group" aria-label="${W[k].name}: whose hand">${[1, 2, 3].map(p => { const ok = deskTargets(k).includes(p);
    return `<button type="button" class="tgb" data-target="${k}" data-p="${p}" aria-pressed="${D[k + "T"] === p}"${ok ? "" : " disabled"}>${disc(p)}<span>${PN[p]}</span></button>`; }).join("")}</div>`;
  const row = (k, opt, bid) => `<section class="wrow" data-w="${k}"><div class="wn"><b>${W[k].name}</b><span>${WDESC[k]}</span><em>${k === "track" ? `House price ${nf(W[k].reserve)}. No bot wants it.` : `${W[k].lots} ${W[k].lots === 1 ? "lot" : "lots"} · house reserve ${nf(W[k].reserve)}`}</em>${opt}</div>${bid}<p class="err" id="we-${k}" role="alert" hidden></p></section>`;
  const qty = `<div class="tg" role="group" aria-label="How many peeks">${[1, 2].map(n => `<button type="button" class="tgb q" data-qty="${n}" aria-pressed="${D.peekN === n}">×${n}</button>`).join("")}</div>`;
  const track = G.tracker ? `<div class="wbid own">Yours this round</div>` : `<div class="wbid"><button type="button" class="tgb buy" id="wb-track" aria-pressed="${D.track}">${D.track ? "Buying" : "Buy"} for ${nf(W.track.reserve)}</button></div>`;
  const sheet = `<div class="desk sheet" id="desk">${row("peek", qty, inp("peek"))}${row("scan", tgt("scan"), inp("scan"))}${deskTargets("xray").length ? row("xray", tgt("xray"), inp("xray")) : ""}${row("track", "", track)}</div>`;
  return `<div class="col"><h2 class="disp">The data desk</h2><p class="note">Bid for the data you want, then seal. Each lot goes to the highest sealed bids, and every winner pays the clearing price: the best losing bid, or the house reserve if that is higher. You never pay more than you bid. Payments go to the house.</p>
    <p class="note">Everyone sees who bought what and the price, never the cards.</p></div>
  <div class="col">${sheet}</div>
  <div class="col"><p class="mine" id="deskSum"></p><p class="sr" id="sealMsg" role="status"></p><button class="btn" id="seal"></button></div>`;
}
/* what you would pay at most if every bid cleared at its own price */
function deskCheck() {
  const D = U.desk, W = WIDGETS, err = {}; let most = 0, any = false;
  for (const k of ["peek", "scan", "xray"]) {
    const raw = String(D[k] || "").trim(); if (raw === "") continue;
    const v = Number(raw);
    if (!isFinite(v) || v <= 0) { err[k] = "Type a price, like 2.5, or leave it empty."; continue; }
    if (v < W[k].reserve) { err[k] = `The house reserve is ${nf(W[k].reserve)}. Bid that or more.`; continue; }
    if (k !== "peek" && !D[k + "T"]) { err[k] = "Pick whose hand."; continue; }
    most += v * (k === "peek" ? D.peekN : 1); any = true;
  }
  if (D.track && !G.tracker) { most += W.track.reserve; any = true; }
  if (most > G.chips[0] + 1e-9) err.total = `That could cost ${nf(most)}, and you have ${nf(G.chips[0])}. Bid less.`;
  return { err, most, any, ok: !Object.keys(err).length };
}
function updateDesk() {
  const c = deskCheck();
  for (const k of ["peek", "scan", "xray"]) { const e = $("we-" + k); if (!e) continue; e.hidden = !c.err[k]; e.textContent = c.err[k] || "";
    const i = $("wb-" + k); if (i) i.setAttribute("aria-invalid", c.err[k] ? "true" : "false"); }
  $("deskSum").innerHTML = c.err.total ? esc(c.err.total) : c.any ? `At most <b>${nh(c.most)}</b> if every bid clears at its price. Usually less.` : "No bids yet. You can pass this desk.";
  const b = $("seal"); b.textContent = c.any ? "Seal my bids" : "Pass this desk"; b.disabled = !c.ok || U.sealing;
}
function myDeskBids() {
  const D = U.desk, num = k => { const v = Number(String(D[k] || "").trim()); return String(D[k] || "").trim() !== "" && isFinite(v) ? Math.round(v * 10) / 10 : null; };
  const pk = num("peek"), sc = num("scan"), xr = num("xray");
  return { peek: pk != null ? Array(D.peekN).fill(pk) : [], scan: sc != null && D.scanT ? { bid: sc, target: D.scanT } : null,
    xray: xr != null && D.xrayT ? { bid: xr, target: D.xrayT } : null, track: D.track && !G.tracker ? WIDGETS.track.reserve : null };
}
/* signature move 1, the seal, kept short: the sheet stamps, any click skips it */
function sealBid() {
  const c = deskCheck(); if (!c.ok || U.sealing) return;
  U.sealing = true; U.sealBids = myDeskBids();
  document.querySelectorAll("#desk input, #desk button, #seal").forEach(el => el.disabled = true);
  $("desk").classList.add("sealed"); $("sealMsg").textContent = c.any ? "Bids sealed." : "Passed.";
  later(REDUCED ? 50 : 520, finishSeal);
}
function finishSeal() { if (!U.sealing) return; U.sealing = false; clearLater(); placeDesk(U.sealBids); }

/* ---------- panel: desk results ---------- */
function resultPanel() {
  const r = G.desk[G.desk.length - 1], go = `<button class="btn" id="go">Start window ${G.k + 1}</button>`;
  const rows = ["peek", "scan", "xray", "track"].map(k => { const o = r.res[k]; if (k === "track" && !o.wins.length) return "";
    const who = o.wins.length ? o.wins.map(w => `<span class="nm">${w.p ? disc(w.p) + PN[w.p] : disc(0)}${w.target != null ? ` <i>on ${w.target ? PN[w.target] : "you"}</i>` : ""}</span>`).join("") : `<span class="none">No sale</span>`;
    return `<div class="rw" role="row"><span role="cell"><b>${WIDGETS[k].name}</b></span><span class="wbuy" role="cell">${who}</span><span class="p" role="cell">${o.wins.length ? nh(o.price) : ""}</span></div>`; }).join("");
  const table = `<div class="bids lots sheet" role="table" aria-label="Desk ${G.k + 1} results"><p class="hd" role="row"><span role="columnheader">Widget</span><span role="columnheader">Bought by</span><span role="columnheader" style="text-align:right">Price</span></p>${rows}</div>`;
  const paid = (r.res.peek.wins.filter(w => w.p === 0).length * r.res.peek.price) + ["scan", "xray", "track"].reduce((a, k) => a + (r.res[k].wins.some(w => w.p === 0) ? r.res[k].price : 0), 0);
  const got = r.got.length ? r.got.map(g => `<section class="gotcard paper"><p class="tag">${WIDGETS[g.kind].name} · ${disc(g.owner)} ${PN[g.owner]}${g.whole ? ", whole hand" : ""}</p><ul class="hand sm" aria-label="${countsText(g.cards)}">${tilesHTML(g.cards, { idp: "g" + g.owner + g.kind })}</ul></section>`).join("")
    : `<p class="so paper">${r.mine && (r.mine.peek.length || r.mine.scan || r.mine.xray) ? "Outbid this time. You paid nothing." : "You passed. You paid nothing."}</p>`;
  const track = r.res.track.wins.some(w => w.p === 0) ? `<p class="so paper">The tracker is yours for the rest of the round. It sits above the market.</p>` : "";
  const claims = r.claims.map(c => `<p class="so paper">${PN[c.p]} says the card it peeked was a ${ONE[c.s]}.</p>`).join("");
  return `<div class="col"><h2 class="disp">${r.got.length ? "What you saw" : "Desk results"}</h2>${got}${track}${paid ? `<p class="mine">You paid <b>${nh(paid)}</b> to the house.</p>` : ""}</div>
    <div class="col">${table}</div>
    <div class="col">${claims}${go}</div>`;
}

/* ---------- panel: trading ---------- */
function tradePanel() {
  const field = (s, k) => `<span class="fields" id="${k === "bids" ? "fb" : "fa"}${s}"><label class="sr" for="${k === "bids" ? "qb" : "qa"}${s}">Your ${SUITS[s]} ${k === "bids" ? "bid" : "ask"}</label><input id="${k === "bids" ? "qb" : "qa"}${s}" placeholder="${k === "bids" ? "Bid" : "Ask"}" inputmode="decimal" autocomplete="off" data-s="${s}" data-kind="${k}"><button data-post="${k}" data-s="${s}" aria-label="Post ${SUITS[s]} ${k === "bids" ? "bid" : "ask"}">Post</button></span>`;
  const up = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 2l4 6H1z" fill="currentColor"/></svg>', down = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8L1 2h8z" fill="currentColor"/></svg>';
  const rows = [0, 1, 2, 3].map(s => `<section class="row" role="listitem" aria-label="${SUITS[s]}">
    <p class="nm2"><b class="${RED[s] ? "red" : "blk"}">${sv(s)}${SUITS[s]}</b><span class="hold" id="h${s}"></span><span class="tag" id="tg${s}" hidden></span></p>
    <div class="side sl"><div class="tw"><div id="sl${s}"></div><button class="penny" id="pnb${s}" data-penny="bids" data-s="${s}">${up}</button></div><span id="pb${s}"></span>${field(s, "bids")}</div>
    <div class="side by"><div class="tw"><div id="by${s}"></div><button class="penny" id="pna${s}" data-penny="asks" data-s="${s}">${down}</button></div><span id="pa${s}"></span>${field(s, "asks")}</div>
    <p class="err" id="er${s}" role="alert" hidden></p></section>`).join("");
  return `<div class="mhead"><h2 class="disp">Market</h2><p class="note" id="clearNote" role="status"></p><div class="mtools"><button class="link" id="openHist">All trades</button><button class="link" id="openKeys">Keys <kbd>?</kbd></button><button class="btn ghost sm" id="pausew" aria-pressed="false">Pause</button><button class="btn ghost sm" id="endw">End window now</button></div></div>
  ${G.tracker ? `<div class="trk sheet" id="trk" aria-label="Tracker: each player's net buys and sells since the deal"></div>` : ""}
  <div class="sheet" role="list" id="mkt">${rows}</div>
  <section class="trades phone-only" aria-labelledby="t-h"><h3 id="t-h">Latest trades</h3><ul id="tl" aria-live="polite"><li class="note">No trades yet.</li></ul></section>`;
}
function bestView(s, q) {
  const mq = G.myQuotes, bot = q[s];
  let bid = bot.bid && bot.bid.p > 0 ? { p: bot.bid.p, seat: bot.bid.seat } : null;
  let ask = bot.ask && isFinite(bot.ask.p) ? { p: bot.ask.p, seat: bot.ask.seat } : null;
  const mb = mq ? mq.bids[s] : null, ma = mq ? mq.asks[s] : null;
  if (mb != null && (!bid || mb > bid.p)) bid = { p: mb, seat: 0 };
  if (ma != null && (!ask || ma < ask.p)) ask = { p: ma, seat: 0 };
  return { bid, ask, bot, mb, ma };
}
function checkQuote(s, kind, raw, v, q) {
  raw = String(raw).trim(); if (raw === "") return `Type a ${kind === "bids" ? "bid" : "ask"} first.`;
  const x = Number(raw); if (!isFinite(x) || x <= 0) return "Type a price above 0, like 2.5.";
  if (kind === "bids") {
    if (v.ask && v.ask.seat === 0 && x >= v.ask.p) return `${raw} is at or above your own ask of ${nf(v.ask.p)}. Bid below it.`;
    if (v.ask && x >= v.ask.p) return `${raw} crosses the ask of ${nf(v.ask.p)}. Bid below it, or buy at ${nf(v.ask.p)}.`;
    if (x > G.chips[0]) return `You have ${nf(G.chips[0])} chips. Bid that or less.`;
  } else {
    if (G.hands[0][s] < 1) return `You hold no ${SUITS[s]} to offer.`;
    if (v.bid && v.bid.seat === 0 && x <= v.bid.p) return `${raw} is at or below your own bid of ${nf(v.bid.p)}. Ask above it.`;
    if (v.bid && x <= v.bid.p) return `${raw} crosses the bid of ${nf(v.bid.p)}. Ask above it, or sell at ${nf(v.bid.p)}.`;
  }
  return "";
}
function goalTag(s) { return ""; }   // the suit answers are gone with rules v4
/* the tracker: net cards bought (+) or sold (−) per player and suit since the deal, and who starts trades */
function trackerHTML() {
  const net = [0, 1, 2, 3].map(() => [0, 0, 0, 0]), n = [0, 0, 0, 0], last = [null, null, null, null];
  for (const t of U.hist) { net[t.buyer][t.s]++; net[t.seller][t.s]--; n[t.buyer]++; n[t.seller]++; last[t.s] = t.price; }
  const cell = x => x === 0 ? `<span class="z">·</span>` : `<span class="${x > 0 ? "up" : "dn"}">${x > 0 ? "+" : "−"}${Math.abs(x)}</span>`;
  const head = `<p class="tr h"><span>Tracker</span>${[0, 1, 2, 3].map(s => `<span class="${RED[s] ? "red" : "blk"}">${sv(s)}<i class="sr">${SUITS[s]}</i></span>`).join("")}<span>Trades</span></p>`;
  const rows = [0, 1, 2, 3].map(p => `<p class="tr${p === 0 ? " me" : ""}"><span class="nm">${disc(p)}${p ? PN[p] : "You"}</span>${net[p].map(cell).join("")}<span class="n">${n[p]}</span></p>`).join("");
  const lp = `<p class="tr lp"><span>Last price</span>${last.map(x => `<span>${x == null ? "" : nh(x)}</span>`).join("")}<span></span></p>`;
  return head + rows + lp;
}
/* Update a tile in place so a press that spans a quote change still lands on the same
   button. Replacing it would split mousedown and mouseup across two nodes, and the
   browser would then send the click to the shared parent instead. */
function patchTile(box, html) {
  const t = document.createElement("template"); t.innerHTML = html.trim();
  const n = t.content.firstElementChild, o = box.firstElementChild;
  const kind = el => el.tagName + ":" + el.className.split(" ").slice(0, 2).join(" ");
  if (!o || !n || kind(o) !== kind(n)) { box.replaceChildren(n); return; }
  morph(o, n);
}
/* keep every existing node that still matches, so the node under the pointer survives */
function morph(o, n) {
  if (o.nodeType === 3) { if (o.data !== n.data) o.data = n.data; return; }
  for (const a of [...o.attributes]) if (!n.hasAttribute(a.name)) o.removeAttribute(a.name);
  for (const a of [...n.attributes]) if (o.getAttribute(a.name) !== a.value) o.setAttribute(a.name, a.value);
  const oc = [...o.childNodes], nc = [...n.childNodes];
  nc.forEach((c, i) => {
    const d = oc[i];
    if (d && d.nodeType === c.nodeType && (c.nodeType === 3 || d.tagName === c.tagName)) morph(d, c);
    else if (d) o.replaceChild(c, d); else o.appendChild(c);
  });
  for (let i = nc.length; i < oc.length; i++) oc[i].remove();
}
/* Penny: raise the best bid by one tick, or lower the best ask by one tick, as your own quote */
function pennyState(s, v, hold) {
  const b = $("pnb" + s), a = $("pna" + s); if (!b || !a) return;
  const nb = v.bid ? Math.round((v.bid.p + TICK) * 10) / 10 : null, na = v.ask ? Math.round((v.ask.p - TICK) * 10) / 10 : null;
  const okB = nb != null && nb <= G.chips[0] && !(v.ask && nb >= v.ask.p), okA = na != null && na > 0 && hold > 0 && !(v.bid && na <= v.bid.p);
  b.disabled = !okB; b.setAttribute("aria-label", okB ? `Penny the ${SUITS[s]} bid: bid ${nf(nb)}` : `Penny the ${SUITS[s]} bid, not available`);
  a.disabled = !okA; a.setAttribute("aria-label", okA ? `Penny the ${SUITS[s]} ask: ask ${nf(na)}` : `Penny the ${SUITS[s]} ask, not available`);
  b.dataset.price = okB ? nf(nb) : ""; a.dataset.price = okA ? nf(na) : "";
}
/* post a quote from a typed price, a penny or a helper key; returns an error or "" */
function postQuote(s, kind, raw) {
  const q = bestQuotes(), v = bestView(s, q);
  if (kind === "bids" && v.mb != null && v.bid && v.bid.seat === 0) v.bid = null;   // replacing your own bid
  if (kind === "asks" && v.ma != null && v.ask && v.ask.seat === 0) v.ask = null;
  const err = checkQuote(s, kind, raw, v, q); if (err) return err;
  const x = Math.round(Number(raw) * 10) / 10;
  G.myQuotes[kind][s] = x; U.msg[s] = "";
  G.quoteLog.push({ k: G.k, tLeft: G.ticksLeft, s, kind, price: x, botBestBid: q[s].bid?.p ?? null, botBestAsk: q[s].ask?.p ?? null });
  U.prev = U.prev || []; U.prev[s] = null; renderTrade(); return "";
}
/* buy or sell one card at the best price, with the same checks as the tiles */
function takeTrade(s, side) {
  const v = bestView(s, bestQuotes());
  if (side === "buy") { if (!v.ask) return `No ask in ${SUITS[s]} to buy from.`; if (v.ask.seat === 0) return "That is your own ask."; if (G.chips[0] < v.ask.p) return `You need ${nf(v.ask.p)} chips to buy.`; }
  else { if (!v.bid) return `No bid in ${SUITS[s]} to sell to.`; if (v.bid.seat === 0) return "That is your own bid."; if (G.hands[0][s] < 1) return `You hold no ${SUITS[s]} to sell.`; }
  humanTrade(s, side); return "";
}
function renderTrade() {
  if (G.phase !== "trade") return;
  const q = bestQuotes();
  for (let s = 0; s < 4; s++) {
    const v = bestView(s, q), hold = G.hands[0][s];
    $("h" + s).textContent = `You hold ${hold}`;
    const tg = goalTag(s), tge = $("tg" + s); tge.hidden = !tg; tge.textContent = tg;
    pennyState(s, v, hold);
    const key = JSON.stringify([v.bid, v.ask, hold, v.mb, v.ma, G.chips[0] >= (v.ask ? v.ask.p : 0)]);
    U.prev = U.prev || []; if (U.prev[s] === key) continue; U.prev[s] = key;
    let sl;
    if (!v.bid) sl = `<div class="tile none" role="note" aria-label="No bid in ${SUITS[s]} yet"><b>No bid</b><span class="vb">Sell to</span></div>`;
    else if (v.bid.seat === 0) sl = `<div class="tile own" role="group" aria-label="Your ${SUITS[s]} bid of ${nf(v.bid.p)} is the best bid."><span class="pr"><b>${nh(v.bid.p)}</b><button class="cx" data-cancel="bids" data-s="${s}" aria-label="Cancel your ${SUITS[s]} bid">Cancel</button></span><span class="vb">Your bid</span></div>`;
    else sl = `<button class="tile sell" data-trade="sell" data-s="${s}" ${hold > 0 ? "" : "disabled"} aria-label="${hold > 0 ? `Sell 1 ${ONE[s]} at ${nf(v.bid.p)} to ${PN[v.bid.seat]}` : `You hold no ${SUITS[s]} to sell. Best bid ${nf(v.bid.p)}.`}"><span class="pr"><b>${nh(v.bid.p)}</b>${disc(v.bid.seat)}</span><span class="vb">${hold > 0 ? "Sell to" : "None to sell"}</span></button>`;
    let by;
    if (!v.ask) by = `<div class="tile none" role="note" aria-label="No ask in ${SUITS[s]} yet"><b>No ask</b><span class="vb">Buy from</span></div>`;
    else if (v.ask.seat === 0) by = `<div class="tile own" role="group" aria-label="Your ${SUITS[s]} ask of ${nf(v.ask.p)} is the best ask."><span class="pr"><b>${nh(v.ask.p)}</b><button class="cx" data-cancel="asks" data-s="${s}" aria-label="Cancel your ${SUITS[s]} ask">Cancel</button></span><span class="vb">Your ask</span></div>`;
    else { const can = G.chips[0] >= v.ask.p;
      by = `<button class="tile buy" data-trade="buy" data-s="${s}" ${can ? "" : "disabled"} aria-label="Buy 1 ${ONE[s]} at ${nf(v.ask.p)} from ${PN[v.ask.seat]}"><span class="pr"><b>${nh(v.ask.p)}</b>${disc(v.ask.seat)}</span><span class="vb">Buy from</span></button>`; }
    patchTile($("sl" + s), sl); patchTile($("by" + s), by);
    $("pb" + s).innerHTML = v.mb != null && v.bid && v.bid.seat !== 0 ? `<span class="pill"><span><span class="sr">Your bid </span><b>${nh(v.mb)}</b></span><button data-cancel="bids" data-s="${s}" aria-label="Cancel your ${SUITS[s]} bid">Cancel</button></span>` : "";
    $("pa" + s).innerHTML = v.ma != null && v.ask && v.ask.seat !== 0 ? `<span class="pill"><span><span class="sr">Your ask </span><b>${nh(v.ma)}</b></span><button data-cancel="asks" data-s="${s}" aria-label="Cancel your ${SUITS[s]} ask">Cancel</button></span>` : "";
    $("fb" + s).hidden = v.mb != null; $("fa" + s).hidden = v.ma != null;
  }
  for (let s = 0; s < 4; s++) {
    const typed = ["bids", "asks"].map(k => [k, $((k === "bids" ? "qb" : "qa") + s).value]).filter(([, t]) => t.trim() !== "");
    const v = bestView(s, q); let m = U.msg[s];
    for (const [k, t] of typed) { const e = checkQuote(s, k, t, v, q); $((k === "bids" ? "qb" : "qa") + s).setAttribute("aria-invalid", e ? "true" : "false"); if (e) m = e; }
    if (!typed.length && !U.msg[s]) m = "";
    const er = $("er" + s); if (er.textContent !== m) er.textContent = m; er.hidden = !m;
  }
  updateClock(); renderChips();
  const tk = $("trk"); if (tk) tk.innerHTML = trackerHTML();
}
function renderTape() {
  const now = G.ticksLeft;
  const html = U.trades.length ? U.trades.slice(0, 3).map(t => {
    const me = t.buyer === 0 || t.seller === 0;
    const text = tradeText(t);
    const ago = Math.round((t.at - now) * WINDOW_S / TICKS);
    return `<li>${disc(me ? 0 : t.seller)}<span>${text}</span><span class="when">${ago < 2 ? "Just now" : ago + " s ago"}</span></li>`;
  }).join("") : `<li class="note">No trades yet.</li>`;
  for (const id of ["tl", "tlT"]) { const el = $(id); if (el) el.innerHTML = html; }
  if (!$("histO").hidden) fillHist();
}
function histRows(clickable) {
  if (!U.hist.length) return `<p class="note">No trades yet this round.</p>`;
  return `<ol class="hist" ${clickable ? 'aria-label="Steps of the round"' : 'aria-label="Every trade this round, newest first"'}>${(clickable ? [{ deal: true }, ...U.hist] : U.hist.slice().reverse()).map((t, j) => {
    if (t.deal) return `<li><button class="hstep" data-step="-1" aria-pressed="${U.review === -1}"><span class="hk">Deal</span><span>As dealt</span></button></li>`;
    const i = clickable ? j - 1 : U.hist.length - 1 - j, me = t.buyer === 0 || t.seller === 0;
    const body = `<span class="hk">W${t.k + 1} ${clock(t)}</span>${disc(me ? 0 : t.seller)}<span>${tradeText(t)}</span>`;
    return clickable ? `<li><button class="hstep" data-step="${i}" aria-pressed="${U.review === i}">${body}</button></li>` : `<li>${body}</li>`;
  }).join("")}</ol>`;
}
function fillHist() { $("histList").innerHTML = histRows(false); $("histCount").textContent = `${U.hist.length} ${U.hist.length === 1 ? "trade" : "trades"}`; }
function openHist() { fillHist(); $("histO").hidden = false; $("closeHist").focus(); }
function closeHist() { $("histO").hidden = true; const o = $("openHist"); if (o) o.focus(); }

/* ---------- panel: end ---------- */
function endPanel() {
  const R = G.result, g = G.cfg.goal, bonus = POT - GOAL_PAY * G.cfg.c[g];
  const top = Math.max(...R.goalCounts), winners = R.goalCounts.filter(x => x === top).length;
  const ord = [0, 1, 2, 3].sort((a, b) => R.pay[b] - R.pay[a] || a - b);
  const rows = ord.map(p => `<div class="r${p === 0 ? " you" : ""}" role="row"><span class="nmx" role="cell">${disc(p)}${p ? PN[p] : esc(meName())}</span><span role="cell">${R.goalCounts[p]}</span><span role="cell">${GOAL_PAY * R.goalCounts[p]}</span><span role="cell">${R.goalCounts[p] === top ? nh(bonus / winners) : ""}</span><span class="tot" role="cell">${nh(R.pay[p])}</span></div>`).join("");
  const after = G.chips[0] + R.pay[0];
  const types = [1, 2, 3].map(p => { const [line, gloss] = TYPE_LINE[G.types[p - 1]] || [`played ${G.types[p - 1]}`, ""]; return `<li><b>${PN[p]}</b> ${line}. <span>${gloss}</span></li>`; }).join("");
  const rev = G.desk.map(r => { const mine = [];
    for (const k of ["peek", "scan", "xray", "track"]) { const n = r.res[k].wins.filter(w => w.p === 0).length; if (n) mine.push(`${WIDGETS[k].name}${n > 1 ? " ×" + n : ""} at ${nf(r.res[k].price)}`); }
    return `<tr><td>${r.k + 1}</td><td style="text-align:left">${mine.join(", ") || "Nothing"}</td><td style="text-align:left">${deskLine(r)}</td></tr>`; }).join("");
  const spent = G.spent || [0, 0, 0, 0];
  return `<div class="col"><p class="so paper phone-only">${SUITS[G.cfg.long]} had 12, so ${SUITS[g]} is the goal suit.</p>
  <h2 class="disp">Payout</h2>
  <div class="chipsnow paper"><p class="big"><b>${nh(after)}</b><span>your chips</span></p>
    <dl><dt>Before payout</dt><dd>${nh(G.chips[0])}</dd><dt>Payout</dt><dd>+${nh(R.pay[0])}</dd><dt>Net after the 50 ante</dt><dd>${sh(R.net[0])}</dd></dl>${ratingLine()}</div>${standingsHTML()}</div>
  <div class="col"><div class="pay sheet" role="table" aria-label="Payout from the pot of 200"><div class="r h" role="row"><span role="columnheader">Player</span><span role="columnheader" aria-label="${SUITS[g]} held">${sv(g, RED[g] ? "red" : "blk")}</span><span role="columnheader">At 10</span><span role="columnheader">Bonus</span><span role="columnheader">Total</span></div>${rows}</div></div>
  <div class="col"><ul class="types">${types}</ul>
  <details class="more"><summary>Review the data desk</summary><div class="review sheet"><table><thead><tr><th>Desk</th><th style="text-align:left">You bought</th><th style="text-align:left">All sales</th></tr></thead><tbody>${rev}</tbody></table></div>
    <p class="note" style="margin-top:8px">Paid to the house this round: you ${nf(spent[0])}, ${[1, 2, 3].map(p => `${PN[p]} ${nf(spent[p])}`).join(", ")}. In simulation a bot values one card shown at under a chip, and a whole hand at about 5 to 8.</p></details>
  <details class="more" id="reviewBox"${U.review != null ? " open" : ""}><summary>Review the round</summary><p class="note">Pick a step to see every hand at that moment.</p>${histRows(true)}${U.review != null ? '<button class="link" id="reviewOff">Back to the final hands</button>' : ""}</details>
  <div class="again"><button class="btn" id="rematch">Rematch, same bots</button><button class="btn ghost" id="again">New bots</button></div>
  <div class="links"><button class="link" id="openSaved">Saved games</button><button class="link" id="openRules">Rules</button></div></div>`;
}
/* standings across rounds against the same three bots (Figgie ranks by cumulative bank) */
function standingsHTML() {
  const S = U.sess; if (!S) return "";
  const ord = [0, 1, 2, 3].sort((a, b) => S.net[b] - S.net[a] || a - b);
  return `<section class="standings sheet" aria-label="Standings"><p class="hd">Standings after ${S.rounds} ${S.rounds === 1 ? "round" : "rounds"} with these bots</p>${ord.map((p, i) => `<p class="r${p === 0 ? " you" : ""}"><span class="rk">${i + 1}</span><span class="nmx">${disc(p)}${p ? PN[p] : esc(meName())}</span><span class="tot">${sh(S.net[p])}</span></p>`).join("")}</section>`;
}

/* ---------- saved games ---------- */
async function openSaved() {
  const O = $("saved"); O.hidden = false; document.body.style.overflow = "hidden";
  const list = $("savedList");
  const bone = `<div class="gr" aria-hidden="true"><i class="bone" style="width:80px"></i><i class="bone hide-s" style="width:120px"></i><i class="bone" style="width:60px;margin-left:auto"></i><i class="bone" style="width:50px;margin-left:auto"></i><i class="bone hide-s" style="width:90px"></i></div>`;
  list.innerHTML = `<div class="gl sheet" aria-busy="true">${head()}${bone}${bone}${bone}</div><p class="note" role="status" style="margin-top:10px">Loading your games…</p>`;
  $("closeSaved").focus();
  let docs = null, why = "";
  try {
    const db = await window.claude?.use?.("db"), user = await window.claude?.use?.("user");
    const id = user ? await user.id() : null;
    if (!db || !id) why = "Saving needs a signed-in viewer with Contributor access to this page. You can still play.";
    else { const snap = await db.collection(`games/${id}/rounds`).orderBy("startedAt", "desc").limit(50).get(); docs = snap.docs.map(d => d.data()); }
  } catch (e) { why = "Your saved games could not be loaded. Try again in a moment."; }
  if (O.hidden) return;
  if (why) { list.innerHTML = emptyHTML("Saved games are off", why, false); return; }
  if (!docs.length) { list.innerHTML = emptyHTML("No games yet", "Each finished round lands here with every bid and trade.", true); return; }
  list.innerHTML = `${statsHTML(docs)}<div class="gl sheet" role="table" aria-label="Your saved games, newest first">${head()}${docs.map((d, i) => {
    const [won, n] = deskUse(d), end = (d.myNet ?? 0) + START;
    const when = (() => { try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d.startedAt)); } catch (e) { return ""; } })();
    return `<div class="gr" role="row"><span class="g" role="cell">Game ${esc(d.gameNo ?? i + 1)}</span><span class="hide-s note" role="cell">${esc(when)}${d.goal != null ? ` · goal ${esc(SUITS[d.goal])}` : ""}</span><span class="num c" role="cell">${nh(end)}</span><span class="num ${d.myNet >= 0 ? "up" : "dn"}" role="cell">${sh(d.myNet || 0)}</span><span class="hide-s" role="cell" aria-label="${won} of ${n} ${d.desk ? "desks used" : "auctions won"}"><span class="bars" aria-hidden="true">${Array.from({ length: n }, (_, j) => `<i class="${j < won ? "w" : ""}"></i>`).join("")}</span></span></div>`;
  }).join("")}</div><p class="note" style="margin-top:10px">Net counts from 350, before the ante.</p>`;
  function head() { return `<div class="gr h" role="row"><span role="columnheader">Game</span><span class="hide-s" role="columnheader">Played</span><span class="num" role="columnheader">Chips at end</span><span class="num" role="columnheader">Net</span><span class="hide-s" role="columnheader">Desks used</span></div>`; }
}
/* windows where you bought something at the desk (rules v4); older rounds count auctions won */
function deskUse(d) {
  if (d.desk) return [d.desk.filter(r => ["peek", "scan", "xray", "track"].some(k => r.res && r.res[k] && r.res[k].wins.some(w => w.p === 0))).length, d.desk.length];
  return [(d.auctions || []).filter(a => a.winner === 0).length, (d.auctions || []).length];
}
function statsHTML(docs) {
  const nets = docs.map(d => d.myNet || 0), n = nets.length, tot = nets.reduce((a, b) => a + b, 0);
  const spent = docs.reduce((a, d) => a + (d.spent ? d.spent[0] || 0 : 0), 0);
  const cell = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<dl class="pstats paper" aria-label="Your stats">${cell("Rounds", n)}${cell("Total net", sh(tot))}${cell("Average", sh(tot / n))}${cell("Best", sh(Math.max(...nets)))}${cell("In profit", `${nets.filter(x => x > 0).length} of ${n}`)}${cell("Paid for data", nh(spent))}</dl>`;
}
function emptyHTML(h, p, btn) {
  return `<div class="emptyg"><section class="copy paper"><h3 class="disp">${esc(h)}</h3><p>${esc(p)}</p>${btn ? `<button class="btn" id="emptyDeal" style="background:var(--ink);color:var(--paper)">${U.view === "start" ? "Deal your first round" : "Back to the table"}</button>` : ""}</section><div class="pane stage" aria-hidden="true"><div class="deck"><i class="cardback"></i><i class="cardback"></i><i class="cardback"></i></div></div></div>`;
}
function closeSaved() { $("saved").hidden = true; document.body.style.overflow = ""; const o = $("openSaved"); if (o) o.focus(); }
function openKeys() { $("keysO").hidden = false; document.body.style.overflow = "hidden"; $("closeKeys").focus(); }
function closeKeys() { $("keysO").hidden = true; document.body.style.overflow = ""; const o = $("openKeys"); if (o) o.focus(); }
function openRules() { $("rulesO").hidden = false; document.body.style.overflow = "hidden"; $("closeRules").focus(); }
function closeRules() { $("rulesO").hidden = true; document.body.style.overflow = ""; const o = $("openRules"); if (o) o.focus(); }

/* ---------- profile and achievements (Figgie: name, avatar, frame, trophies) ----------
   Kept in the signed-in viewer's own area, games/<id>/meta/profile, beside their rounds;
   mirrored in this browser, which is the only copy for a guest. */
const AVATAR_COLORS = { brass: "#d8a63f", red: "#d9434b", blue: "#2f5fae", green: "#2f9e78", orange: "#e07b3c" };
const GLYPHS = [{ seed: 5, need: 0 }, { seed: 3, need: 0 }, { seed: 11, need: 0 }, { seed: 7, need: 2 }, { seed: 19, need: 5 }, { seed: 23, need: 8 }];
const FRAMES = [{ id: "none", name: "No frame", need: 0 }, { id: "bronze", name: "Bronze", need: 3, col: "#a8713a" }, { id: "silver", name: "Silver", need: 6, col: "#b9c2c8" },
  { id: "gold", name: "Gold", need: 9, col: "#d8a63f" }, { id: "maze", name: "Maze", need: 12, col: "#16201b" }];
/* r is the round just finished; c is the running counters (already updated for this round) */
const ACH = [
  { id: "first_round", name: "First hand", text: "Finish a round.", test: (r, c) => c.rounds >= 1 },
  { id: "in_profit", name: "In the money", text: "Finish a round ahead.", test: r => r.net > 0 },
  { id: "bonus", name: "The bonus", text: "Hold the most goal-suit cards at the end.", test: r => r.bonus },
  { id: "auction", name: "Data buyer", text: "Win a lot at the data desk.", test: r => r.won >= 1 },
  { id: "sweep", name: "Full picture", text: "Buy data at all four desks in one round.", test: r => r.desks >= 4 },
  { id: "watcher", name: "Free rider", text: "Finish a round ahead without buying any data.", test: r => r.net > 0 && r.won === 0 },
  { id: "maker", name: "Market maker", text: "Have three of your quotes taken in one round.", test: r => r.filled >= 3 },
  { id: "keys", name: "Keyboard trader", text: "Make a trade with the helper keys.", test: r => r.keyTrade },
  { id: "penny", name: "Penny pincher", text: "Penny a price five times.", test: (r, c) => c.pennies >= 5, prog: c => [c.pennies, 5, "pennies"] },
  { id: "learner", name: "Study hall", text: "Finish a Learning round.", test: r => r.learning },
  { id: "streak", name: "Hot streak", text: "Finish ahead three rounds in a row.", test: (r, c) => c.streak >= 3, prog: c => [c.streak, 3, "in a row"] },
  { id: "regular", name: "Regular", text: "Finish ten rounds.", test: (r, c) => c.rounds >= 10, prog: c => [c.rounds, 10, "rounds"] },
];
const PROF0 = () => ({ name: "", color: "brass", glyph: 0, frame: "none", unlocked: {}, c: { rounds: 0, streak: 0, pennies: 0 },
  rating: 1000, rated: 0, wk: { id: "", gain: 0, rounds: 0 }, day: { last: "", run: 0, best: 0 } });
function mergeProf(x) { const p = PROF0(); if (!x || typeof x !== "object") return p;
  return { ...p, ...x, name: String(x.name || "").slice(0, 18), unlocked: { ...(x.unlocked || {}) }, c: { ...p.c, ...(x.c || {}) },
    rating: Number.isFinite(+x.rating) ? +x.rating : 1000, rated: +x.rated || 0, wk: { ...p.wk, ...(x.wk || {}) }, day: { ...p.day, ...(x.day || {}) } }; }
U.prof = (() => { try { return mergeProf(JSON.parse(localStorage.getItem("baf-profile") || "null")); } catch (e) { return PROF0(); } })();
const nGot = () => Object.keys(U.prof.unlocked).filter(k => ACH.some(a => a.id === k)).length;
const meName = () => U.prof.name.trim() || "You";
function rng(seed) { let a = seed >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function mazeD(seed, n = 3, c = 7, o = 4.5) {
  const r = rng(seed), seen = new Set(["0,0"]), st = [[0, 0]]; let d = "";
  while (st.length) { const [x, y] = st[st.length - 1];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !seen.has(a + "," + b));
    if (!nb.length) { st.pop(); continue; }
    const [a, b] = nb[Math.floor(r() * nb.length)]; seen.add(a + "," + b); d += `M${o + x * c} ${o + y * c}L${o + a * c} ${o + b * c}`; st.push([a, b]); }
  return d;
}
function avatarSVG(p = U.prof, size = 32, over = {}) {
  const q = { ...p, ...over }, col = AVATAR_COLORS[q.color] || AVATAR_COLORS.brass, g = GLYPHS[q.glyph] || GLYPHS[0], fr = FRAMES.find(f => f.id === q.frame);
  const ring = fr && fr.col ? `<rect x=".9" y=".9" width="21.2" height="21.2" fill="none" stroke="${fr.col}" stroke-width="1.8"${fr.id === "maze" ? ' stroke-dasharray="3 1.5"' : ""}/>` : "";
  return `<svg class="ava" width="${size}" height="${size}" viewBox="0 0 23 23" aria-hidden="true"><rect width="23" height="23" fill="#f3f0ea"/><path d="${mazeD(g.seed)}" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="square"/>${ring}</svg>`;
}
const TROPHY = '<svg class="cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3h3v2a4 4 0 0 1-4 4h-.4A5 5 0 0 1 13 14.8V18h3v3H8v-3h3v-3.2A5 5 0 0 1 8.4 12H8a4 4 0 0 1-4-4V6h3zM4 8a2 2 0 0 0 2 2h1V8zm13 0v2h1a2 2 0 0 0 2-2z" fill="currentColor"/></svg>';
function renderWho() {
  const el = $("who"); if (!el) return; const n = nGot();
  el.innerHTML = `${streakHTML()}<button class="rate" id="openBoard" aria-label="Leaderboard, your rating ${Math.round(U.prof.rating)}"><svg class="cup" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V11h5v10zm6.5 0V3h5v18zM16 21v-7h5v7z" fill="currentColor"/></svg><span>${Math.round(U.prof.rating)}</span></button><button class="trophy${U.trophyPulse ? " pulse" : ""}" id="openAch" aria-label="Achievements, ${n} of ${ACH.length}">${TROPHY}<span>${n}/${ACH.length}</span></button><button class="me" id="openProf" aria-label="Your profile">${avatarSVG(U.prof, 30)}<span class="nm">${esc(meName())}</span></button>`;
  const fr = FRAMES.find(f => f.id === U.prof.frame);
  document.body.classList.toggle("has-frame", !!(fr && fr.col)); if (fr && fr.col) document.body.style.setProperty("--frame", fr.col);
  const s0 = $("seat0"); if (s0) s0.innerHTML = seatHTML(0);
}
async function profStore() {
  try { const db = await window.claude?.use?.("db"), user = await window.claude?.use?.("user"); const id = user ? await user.id() : null; U.profRemote = !!(db && id); return db && id ? db.doc(`games/${id}/meta/profile`) : null; } catch (e) { return null; }
}
function saveProfile() {
  if (U.prof.c.rounds) writeBoard();
  try { localStorage.setItem("baf-profile", JSON.stringify(U.prof)); } catch (e) {}
  const body = JSON.parse(JSON.stringify(U.prof));
  U.profSave = (U.profSave || Promise.resolve()).then(async () => { const ref = await profStore(); if (ref) await ref.set(body); }).catch(() => {});
}
async function loadProfile() {
  const ref = await profStore(); if (!ref) return;
  try { const d = await ref.get();
    if (d.exists) { const remote = mergeProf(d.data());
      // keep the larger counters and every unlock from either copy
      remote.unlocked = { ...U.prof.unlocked, ...remote.unlocked };
      for (const k of Object.keys(remote.c)) remote.c[k] = Math.max(remote.c[k] || 0, U.prof.c[k] || 0);
      if ((U.prof.rated || 0) > (remote.rated || 0)) { remote.rating = U.prof.rating; remote.rated = U.prof.rated; remote.wk = U.prof.wk; }
      if ((U.prof.day.last || "") > (remote.day.last || "")) remote.day = U.prof.day;
      U.prof = remote; try { localStorage.setItem("baf-profile", JSON.stringify(U.prof)); } catch (e) {} renderWho(); }
    else if (U.prof.c.rounds || U.prof.name) saveProfile();
  } catch (e) {}
}
/* called once when a round is tallied */
function awardRound() {
  const R = G.result, top = Math.max(...R.goalCounts);
  const mine = G.desk.map(d => ["peek", "scan", "xray", "track"].reduce((a, k) => a + d.res[k].wins.filter(w => w.p === 0).length, 0));
  const r = { net: R.net[0], won: mine.reduce((a, b) => a + b, 0), desks: mine.filter(x => x > 0).length, bonus: R.goalCounts[0] === top && top > 0,
    filled: G.myTrades.filter(t => t.onMyQuote).length,
    keyTrade: !!U.keyTraded, learning: !!G.mode && G.mode !== "standard" };
  const c = U.prof.c; c.rounds++; c.streak = r.net > 0 ? c.streak + 1 : 0;
  rateRound(r);
  const before = nGot(), fresh = ACH.filter(a => !U.prof.unlocked[a.id] && a.test(r, c));
  fresh.forEach(a => U.prof.unlocked[a.id] = new Date().toISOString());
  U.keyTraded = false; saveProfile(); writeBoard();
  if (fresh.length) {
    const after = nGot(), gain = [...FRAMES.filter(f => f.need > before && f.need <= after).map(f => `${f.name} frame`), ...GLYPHS.map((g, i) => g.need > before && g.need <= after ? "a new avatar" : null).filter(Boolean)];
    U.trophyPulse = true; toast(`Achievement unlocked: <b>${fresh.map(a => a.name).join(", ")}</b>${gain.length ? `. You can now pick ${gain.join(" and ")}.` : ""}`);
    setTimeout(() => { U.trophyPulse = false; renderWho(); }, 5000);
  }
  renderWho();
}
/* ---------- rating, weekly and all-time leaderboards, daily streak ----------
   Elo-style: each Standard round is three games, one against each bot (all rated 1000):
   finishing ahead of a bot on net scores 1, level 0.5, behind 0. K = 24. Learning rounds
   don't count toward the rating (as on Figgie) but do count as rounds played. */
const BOT_RATING = 1000, K_ELO = 24;
function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}
function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function rateRound(r) {
  const P = U.prof, today = dayKey(), D = P.day;
  if (D.last !== today) { const y = new Date(); y.setDate(y.getDate() - 1); D.run = D.last === dayKey(y) ? D.run + 1 : 1; D.last = today; D.best = Math.max(D.best || 0, D.run); }
  const wk = weekId(); if (P.wk.id !== wk) P.wk = { id: wk, gain: 0, rounds: 0 };
  P.wk.rounds++;
  U.lastDR = null;
  if (r.learning) return;
  const net = G.result.net, E = 1 / (1 + 10 ** ((BOT_RATING - P.rating) / 400)); let dR = 0;
  for (const q of [1, 2, 3]) { const S = net[0] > net[q] ? 1 : net[0] < net[q] ? 0 : 0.5; dR += K_ELO * (S - E); }
  P.rating += dR; P.rated++; P.wk.gain += dR; U.lastDR = dR;
}
function streakHTML() {
  const run = U.prof.day.run || 0; if (!run || U.prof.day.last < dayKey(new Date(Date.now() - 864e5))) return "";
  const lv = run >= 30 ? "lv3" : run >= 7 ? "lv2" : "lv1";
  return `<span class="streak ${lv}" role="img" aria-label="${run}-day streak${run >= 7 ? `, level ${lv === "lv3" ? 3 : 2}` : ""}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>${run}</span>`;
}
function ratingLine() {
  if (U.lastDR == null) return `<p class="rating note">Learning rounds don't change your rating.</p>`;
  const d = Math.round(U.lastDR), sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return `<p class="rating">Rating <b>${Math.round(U.prof.rating)}</b> <span>${sign}${Math.abs(d)}</span></p>`;
}
async function boardRef() {
  try { const db = await window.claude?.use?.("db"), user = await window.claude?.use?.("user"); const id = user ? await user.id() : null; return db && id ? { db, id } : null; } catch (e) { return null; }
}
function boardDoc() {
  const P = U.prof;
  return { name: (P.name.trim() || "Player").slice(0, 18), color: P.color, glyph: P.glyph, frame: P.frame, rating: Math.round(P.rating), rated: P.rated,
    rounds: P.c.rounds, week: P.wk.id, weekGain: Math.round(P.wk.gain * 10) / 10, weekRounds: P.wk.rounds, streak: P.day.run, updatedAt: new Date().toISOString() };
}
function writeBoard() {
  if (!U.prof.c.rounds) return;
  const body = boardDoc();
  U.boardSave = (U.boardSave || Promise.resolve()).then(async () => { const b = await boardRef(); if (b) await b.db.doc(`board/${b.id}`).set(body); }).catch(() => { U.boardErr = true; });
}
/* Rows come from other players: every field is checked and every name is set as text. */
function cleanRow(id, d) {
  const n = x => Number.isFinite(+x) ? +x : 0;
  return { id, name: String(d.name || "Player").slice(0, 18), color: d.color in AVATAR_COLORS ? d.color : "brass",
    glyph: Number.isInteger(+d.glyph) && +d.glyph >= 0 && +d.glyph < GLYPHS.length ? +d.glyph : 0, frame: FRAMES.some(f => f.id === d.frame) ? d.frame : "none",
    rating: n(d.rating), rated: n(d.rated), rounds: n(d.rounds), week: String(d.week || ""), weekGain: n(d.weekGain), weekRounds: n(d.weekRounds), streak: n(d.streak) };
}
U.board = { period: "all", metric: "rating", rows: null, why: "" };
async function openBoard() {
  $("boardO").hidden = false; document.body.style.overflow = "hidden"; $("closeBoard").focus();
  $("boardBody").innerHTML = `<p class="note" role="status">Loading the leaderboard…</p>`;
  const b = await boardRef();
  if (!b) { U.board.rows = null; U.board.why = "The leaderboard needs a signed-in viewer with Contributor access to this page. You can still play."; }
  else { try { await (U.boardSave || Promise.resolve()); const snap = await b.db.collection("board").limit(1000).get();
      U.board.rows = snap.docs.filter(d => d.exists).map(d => cleanRow(d.id, d.data())); U.board.me = b.id; U.board.why = ""; }
    catch (e) { U.board.rows = null; U.board.why = "The leaderboard could not be loaded. Try again in a moment."; } }
  renderBoard();
}
function renderBoard() {
  const B = U.board, el = $("boardBody"); if (!el) return;
  const tabs = `<div class="tabs" role="group" aria-label="Period"><button data-period="week" aria-pressed="${B.period === "week"}">This week</button><button data-period="all" aria-pressed="${B.period === "all"}">All time</button></div>
    <div class="tabs" role="group" aria-label="Ranked by"><button data-metric="rating" aria-pressed="${B.metric === "rating"}">Rating</button><button data-metric="rounds" aria-pressed="${B.metric === "rounds"}">Rounds played</button></div>`;
  if (!B.rows) { el.innerHTML = `${tabs}<p class="boardmsg">${esc(B.why)}</p>`; return; }
  const wk = weekId(), week = B.period === "week";
  let rows = B.rows.filter(r => week ? r.week === wk && r.weekRounds > 0 : r.rounds > 0);
  if (B.metric === "rating") rows = rows.filter(r => week ? r.week === wk : r.rated > 0);
  const val = r => B.metric === "rating" ? (week ? r.weekGain : r.rating) : (week ? r.weekRounds : r.rounds);
  rows.sort((a, b) => val(b) - val(a) || b.rating - a.rating || (a.id < b.id ? -1 : 1));
  const fmtV = r => B.metric === "rating" ? (week ? signed(Math.round(r.weekGain * 10) / 10) : String(Math.round(r.rating))) : String(val(r));
  const head = B.metric === "rating" ? (week ? "Rating gained" : "Rating") : (week ? "Rounds this week" : "Rounds played");
  const mineAt = rows.findIndex(r => r.id === B.me), shown = rows.slice(0, 50);
  const row = (r, i, pin) => `<li class="br${r.id === B.me ? " me" : ""}${pin ? " pinned" : ""}"><span class="rk">${i + 1}</span>${avatarSVG(r, 28)}<span class="nm"></span><span class="v">${fmtV(r)}</span><span class="sub">${B.metric === "rating" ? `${r.rounds} ${r.rounds === 1 ? "round" : "rounds"}` : `rating ${Math.round(r.rating)}`}</span></li>`;
  el.innerHTML = `${tabs}${rows.length ? `<ol class="board sheet" aria-label="${head}"><li class="br h"><span class="rk">#</span><span></span><span class="nm">Player</span><span class="v">${head}</span><span class="sub"></span></li>${shown.map((r, i) => row(r, i)).join("")}${mineAt >= 50 ? row(rows[mineAt], mineAt, true) : ""}</ol>` : `<p class="boardmsg">Nobody on this board yet.</p>`}
    <p class="note">${mineAt < 0 ? (week ? "Finish a round this week to appear here." : B.metric === "rating" ? "Finish a Standard round to get a rating and appear here." : "Finish a round to appear here.") : `You are ${mineAt + 1} of ${rows.length}.`} Ratings start at 1000; each Standard round counts as a game against each bot. Learning rounds count as rounds played but don't change the rating.</p>`;
  // names come from other players: set as text only
  const items = el.querySelectorAll(".board .br:not(.h) .nm"), list = [...shown, ...(mineAt >= 50 ? [rows[mineAt]] : [])];
  items.forEach((n, i) => { const r = list[i]; n.textContent = r.id === B.me ? `${r.name} (you)` : r.name; });
}
function closeBoard() { $("boardO").hidden = true; document.body.style.overflow = ""; const o = $("openBoard"); if (o) o.focus(); }
function toast(html) {
  const t = $("toast"); if (!t) return; t.innerHTML = html; t.hidden = false;
  clearTimeout(U.toastT); U.toastT = setTimeout(() => { t.hidden = true; }, 6000);
}
function profileHTML() {
  const n = nGot(), P = U.prof;
  const colors = Object.entries(AVATAR_COLORS).map(([k, v]) => `<button class="sw" data-color="${k}" aria-pressed="${P.color === k}" aria-label="${k}" style="background:${v}"></button>`).join("");
  const glyphs = GLYPHS.map((g, i) => `<button class="pick" data-glyph="${i}" aria-pressed="${P.glyph === i}" ${n < g.need ? "disabled" : ""} aria-label="Avatar ${i + 1}${n < g.need ? `, unlocks at ${g.need} achievements` : ""}">${avatarSVG(P, 44, { glyph: i, frame: "none" })}${n < g.need ? `<small>${g.need} trophies</small>` : ""}</button>`).join("");
  const frames = FRAMES.map(f => `<button class="pick" data-frame="${f.id}" aria-pressed="${P.frame === f.id}" ${n < f.need ? "disabled" : ""} aria-label="${f.name}${n < f.need ? `, unlocks at ${f.need} achievements` : ""}">${avatarSVG(P, 44, { frame: f.id })}<small>${f.name}${n < f.need ? ` · ${f.need}` : ""}</small></button>`).join("");
  return `<div class="profhead">${avatarSVG(P, 72)}<div><h3 class="disp">${esc(meName())}</h3><p class="note">${P.c.rounds} ${P.c.rounds === 1 ? "round" : "rounds"} played · rating ${Math.round(P.rating)} · ${n} of ${ACH.length} achievements${P.day.run ? ` · ${P.day.run}-day streak (best ${P.day.best})` : ""}</p></div></div>
    <label class="lbl" for="profName">Display name</label>
    <div class="namerow"><input id="profName" maxlength="18" autocomplete="nickname" value="${esc(P.name)}" placeholder="You"><button class="btn sm" id="saveName">Save name</button></div>
    <h4>Colour</h4><div class="picks">${colors}</div>
    <h4>Avatar</h4><div class="picks">${glyphs}</div>
    <h4>Frame</h4><div class="picks">${frames}</div>
    <p class="note">${U.profRemote ? "Saved to your account." : "Kept in this browser. Sign in to keep it on every device."}</p>`;
}
function achHTML() {
  const c = U.prof.c;
  return `<ol id="achList" class="achs">${ACH.map(a => { const got = U.prof.unlocked[a.id], pr = a.prog && !got ? a.prog(c) : null;
    const when = got && got !== "x" ? (() => { try { return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(got)); } catch (e) { return ""; } })() : "";
    return `<li class="${got ? "got" : ""}">${TROPHY}<div><b>${a.name}</b><p>${a.text}</p><p class="ast">${got ? `Unlocked${when ? " " + when : ""}` : pr ? `${Math.min(pr[0], pr[1])} of ${pr[1]} ${pr[2]}` : "Locked"}</p></div></li>`; }).join("")}</ol>`;
}
function openProf() { $("profBody").innerHTML = profileHTML(); $("profO").hidden = false; document.body.style.overflow = "hidden"; $("closeProf").focus(); }
function closeProf() { $("profO").hidden = true; document.body.style.overflow = ""; const o = $("openProf"); if (o) o.focus(); }
function openAch() { U.trophyPulse = false; renderWho(); $("achBody").innerHTML = achHTML(); $("achO").hidden = false; document.body.style.overflow = "hidden"; $("closeAch").focus(); }
function closeAch() { $("achO").hidden = true; document.body.style.overflow = ""; const o = $("openAch"); if (o) o.focus(); }
function refreshNames() { const P = $("panel"); if (G.phase === "end" && P) P.innerHTML = endPanel(); }

/* ---------- the hooks the game logic calls ---------- */
function render() {
  if (G.phase !== "trade") U.prev = null;
  if (G.phase === "trade" && U.panelPhase !== "trade") { U.trades = []; U.prev = null; U.msg = ["", "", "", ""]; U.act = ["", "", "", ""]; }
  if (G.phase === "bid" && U.panelPhase !== "bid") deskReset();
  renderBar(); renderTable(); renderKnow();
  document.querySelector("details.drawer").hidden = U.view === "start" || G.phase === "end";
  const P = $("panel");
  if (G.phase === "end" && G.result && !G.tallied) {
    G.tallied = true; if (!U.sess) U.sess = { rounds: 0, net: [0, 0, 0, 0] };
    U.sess.rounds++; G.result.net.forEach((x, p) => U.sess.net[p] += x);
    awardRound();
  }
  P.innerHTML = U.view === "start" ? startPanel() : G.phase === "ante" ? antePanel() : G.phase === "bid" ? deskPanel() : G.phase === "result" ? resultPanel() : G.phase === "trade" ? tradePanel() : endPanel();
  U.panelPhase = U.view === "start" ? "start" : G.phase;
  P.className = "panel ph-" + U.panelPhase;
  if (U.view !== "start" && G.phase === "bid") updateDesk();
  if (G.phase === "trade") { renderTrade(); renderTape(); }
  renderSave();
}
function renderSide() { updateSeats(); renderChips(); }
function renderSave() {
  const el = $("save"); if (!el) return;
  el.textContent = G.phase !== "end" || U.view === "start" ? "" :
    G.saved === "ok" ? "Round saved." : G.saved === "saving" ? "Saving the round…" :
    G.saved === "off" ? "Not saved. Saving needs a signed-in viewer with Contributor access." :
    G.saved === "fail" ? "This round could not be saved. The next one will try again." : "";
}
const _doTrade = doTrade;
/* signature move 3: the fill. The card flies between seats and the receiving seat bumps. */
doTrade = function (s, buyer, seller, price, takerBuys) {
  _doTrade(s, buyer, seller, price, takerBuys);
  U.trades.unshift({ s, buyer, seller, price, at: G.ticksLeft }); if (U.trades.length > 12) U.trades.pop();
  U.hist.push({ k: G.k, at: G.ticksLeft, s, buyer, seller, price, hands: [G.hands[0].slice(), ...G.bots.slice(1).map(b => b.hand.slice())], chips: G.chips.slice() });
  // Figgie rule: every trade cancels all of your resting quotes, in every suit
  if (G.myQuotes) { let n = 0; const q = bestQuotes();
    for (const kind of ["bids", "asks"]) for (let x = 0; x < 4; x++) if (G.myQuotes[kind][x] != null) {
      G.myQuotes[kind][x] = null; n++;
      G.quoteLog.push({ k: G.k, tLeft: G.ticksLeft, s: x, kind, price: null, botBestBid: q[x].bid?.p ?? null, botBestAsk: q[x].ask?.p ?? null, reason: "trade" }); }
    if (n) { U.prev = null; const c = $("clearNote"); if (c) { c.textContent = `The trade cleared your ${n === 1 ? "quote" : n + " quotes"}.`; clearTimeout(U.clearT); U.clearT = setTimeout(() => { const e = $("clearNote"); if (e) e.textContent = ""; }, 4000); } } }
  U.act[seller] = `Sold ${sv(s, RED[s] ? "red" : "")} at ${nf(price)}`; U.act[buyer] = `Bought ${sv(s, RED[s] ? "red" : "")} at ${nf(price)}`;
  updateSeats(); flyCard(s, seller, buyer); renderTape();
  if (buyer === 0 || seller === 0) { const c = $("c" + s); if (c) { c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump"); } }
};
function startDeal() {
  WINDOW_S = U.mode === "standard" ? 60 : 300; TICKS = WINDOW_S; G.mode = U.mode;
  G.tallied = false; G.result = null;
  U.hist = []; U.review = null; U.cmd = null; showCmd();
  const d = $("deal"); if (d) { d.disabled = true; d.textContent = "Dealing…"; }
  flyDeal(() => {
    U.view = "game"; G.phase = "ante";
    U.hist0 = { hands: [G.hands[0].slice(), ...G.bots.slice(1).map(b => b.hand.slice())] };
    render(); const b = $("toAuction"); if (b) b.focus();
  });
}
newGame(); U.view = "start"; render(); renderWho(); loadProfile();

/* ---------- events ---------- */
document.addEventListener("click", e => {
  if (U.sealing) { finishSeal(); return; }
  if (U.dealing) { skipDeal(); return; }
  const t = e.target.closest("button"); if (!t) return;
  if (t.id === "deal" || t.id === "again" || t.id === "rematch" || t.id === "emptyDeal") {
    if (t.id === "emptyDeal") { closeSaved(); if (U.view !== "start") return; }
    clearLater();
    if (t.id === "again") { U.sess = null; newGame(); U.view = "start"; render(); }
    if (t.id === "rematch") { const types = G.types.slice(); newGame(); G.types = types; G.bots = [null, ...types.map((ty, i) => { const b = new Bot(ty, i + 1, G.hands[i + 1]); b.deskInit(); return b; })]; U.view = "start"; render(); }
    startDeal(); return;
  }
  if (t.dataset.mode) { U.mode = t.dataset.mode; document.querySelectorAll("button[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === U.mode)); return; }
  if (t.id === "toAuction") { G.phase = "bid"; render(); const b = $("wb-peek"); if (b) b.focus(); return; }
  if (U.paused && (t.dataset.trade || t.dataset.post || t.dataset.cancel || t.dataset.penny)) return;
  if (t.id === "pausew") { U.paused ? resumeWindow() : pauseWindow(); return; }
  if (t.dataset.penny) { const s = +t.dataset.s; if (!t.dataset.price) return; const e = postQuote(s, t.dataset.penny, t.dataset.price); if (e) { U.msg[s] = e; renderTrade(); } else U.prof.c.pennies = (U.prof.c.pennies || 0) + 1; return; }
  if (t.id === "openHist") { openHist(); return; }
  if (t.id === "openProf") { openProf(); return; }
  if (t.id === "openBoard") { openBoard(); return; }
  if (t.id === "closeBoard") { closeBoard(); return; }
  if (t.dataset.period) { U.board.period = t.dataset.period; renderBoard(); return; }
  if (t.dataset.metric) { U.board.metric = t.dataset.metric; renderBoard(); return; }
  if (t.id === "closeProf") { closeProf(); return; }
  if (t.id === "openAch") { openAch(); return; }
  if (t.id === "closeAch") { closeAch(); return; }
  if (t.id === "saveName") { U.prof.name = $("profName").value.trim().slice(0, 18); saveProfile(); renderWho(); $("profBody").innerHTML = profileHTML(); refreshNames(); toast("Name saved."); return; }
  if (t.dataset.color) { U.prof.color = t.dataset.color; saveProfile(); renderWho(); $("profBody").innerHTML = profileHTML(); return; }
  if (t.dataset.glyph != null && !t.disabled) { U.prof.glyph = +t.dataset.glyph; saveProfile(); renderWho(); $("profBody").innerHTML = profileHTML(); return; }
  if (t.dataset.frame && !t.disabled) { U.prof.frame = t.dataset.frame; saveProfile(); renderWho(); $("profBody").innerHTML = profileHTML(); return; }
  if (t.id === "closeHist") { closeHist(); return; }
  if (t.id === "openKeys") { openKeys(); return; }
  if (t.id === "closeKeys") { closeKeys(); return; }
  if (t.dataset.step != null) { U.review = +t.dataset.step; renderTable(); document.querySelectorAll("button[data-step]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.step === U.review)); if (!$("reviewOff")) $("reviewBox").insertAdjacentHTML("beforeend", '<button class="link" id="reviewOff">Back to the final hands</button>'); return; }
  if (t.id === "reviewOff") { U.review = null; renderTable(); document.querySelectorAll("button[data-step]").forEach(b => b.setAttribute("aria-pressed", "false")); t.remove(); return; }
  if (t.id === "openSaved") { openSaved(); return; }
  if (t.id === "closeSaved") { closeSaved(); return; }
  if (t.id === "openRules") { openRules(); return; }
  if (t.id === "closeRules") { closeRules(); return; }
  if (t.dataset.qty) { U.desk.peekN = +t.dataset.qty; document.querySelectorAll("button[data-qty]").forEach(b => b.setAttribute("aria-pressed", b === t)); updateDesk(); return; }
  if (t.dataset.target) { const k = t.dataset.target; U.desk[k + "T"] = +t.dataset.p; document.querySelectorAll(`button[data-target="${k}"]`).forEach(b => b.setAttribute("aria-pressed", b === t)); updateDesk(); return; }
  if (t.id === "wb-track") { U.desk.track = !U.desk.track; t.setAttribute("aria-pressed", U.desk.track); t.textContent = `${U.desk.track ? "Buying" : "Buy"} for ${nf(WIDGETS.track.reserve)}`; updateDesk(); return; }
  if (t.id === "seal") { sealBid(); return; }
  if (t.id === "go") { startWindow(); return; }
  if (t.id === "endw") { while (G.ticksLeft-- > 0) tick(); endWindow(); return; }
  if (t.dataset.trade) {
    const s = +t.dataset.s, v = bestView(s, bestQuotes());
    if (t.dataset.trade === "sell" && v.bid && v.bid.seat === 0) return;
    if (t.dataset.trade === "buy" && v.ask && v.ask.seat === 0) return;
    humanTrade(s, t.dataset.trade); return;
  }
  if (t.dataset.post) {
    const s = +t.dataset.s, kind = t.dataset.post, inp = $((kind === "bids" ? "qb" : "qa") + s);
    const err = postQuote(s, kind, inp.value);
    if (err) { U.msg[s] = err; renderTrade(); inp.focus(); return; }
    inp.value = ""; return;
  }
  if (t.dataset.cancel) {
    const s = +t.dataset.s, kind = t.dataset.cancel, q = bestQuotes();
    G.myQuotes[kind][s] = null;
    G.quoteLog.push({ k: G.k, tLeft: G.ticksLeft, s, kind, price: null, botBestBid: q[s].bid?.p ?? null, botBestAsk: q[s].ask?.p ?? null });
    U.prev[s] = null; renderTrade(); const f = $((kind === "bids" ? "qb" : "qa") + s); if (f) f.focus(); return;
  }
}, true);
document.addEventListener("input", e => {
  if (e.target.dataset && e.target.dataset.desk) { U.desk[e.target.dataset.desk] = e.target.value; updateDesk(); return; }
  if (e.target.matches && e.target.matches("input[data-kind]")) { U.msg[+e.target.dataset.s] = ""; renderTrade(); }
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches && e.target.matches("input[data-kind]")) { e.preventDefault(); const b = e.target.parentElement.querySelector("button[data-post]"); if (b) b.click(); return; }
  if (e.key === "Enter" && e.target.dataset && e.target.dataset.desk) { e.preventDefault(); sealBid(); return; }
  if (e.key === "Enter" && e.target.id === "profName") { e.preventDefault(); $("saveName").click(); return; }
  if (e.key === "Escape") {
    if (U.cmd) { U.cmd = null; showCmd(); return; }
    if (!$("boardO").hidden) closeBoard(); else if (!$("profO").hidden) closeProf(); else if (!$("achO").hidden) closeAch(); else if (!$("saved").hidden) closeSaved(); else if (!$("rulesO").hidden) closeRules(); else if (!$("keysO").hidden) closeKeys(); else if (!$("histO").hidden) closeHist();
    return;
  }
  helperKey(e);
});

/* ---------- Helper Keys (Figgie's keyboard play) ----------
   b + suit + amount + Enter: bid.   a + suit + amount + Enter: offer (ask).
   ff + suit + Enter: buy.            aa + suit + Enter: sell.
   s c h d pick the suit. ? or / opens the list. Esc clears. */
const SUITKEY = { s: 0, c: 1, h: 2, d: 3 };
/* ---------- Pause (Figgie lets the host pause) ----------
   Stops the window's one-second clock, so the bots stop too, and freezes the market. */
function pauseWindow() {
  if (G.phase !== "trade" || U.paused) return;
  clearInterval(G.timer); G.timer = null; U.paused = true; U.cmd = null; showCmd(); showPause();
}
function resumeWindow() {
  if (!U.paused) return;
  U.paused = false;
  G.timer = setInterval(() => { tick(); if (--G.ticksLeft <= 0) endWindow(); else renderTrade(); }, (WINDOW_S * 1000) / TICKS);
  showPause();
}
function showPause() {
  document.body.classList.toggle("paused", !!U.paused);
  const b = $("pausew"); if (b) { b.textContent = U.paused ? "Resume" : "Pause"; b.setAttribute("aria-pressed", String(!!U.paused)); }
  const n = $("pauseNote"), T = $("table");
  if (U.paused && !n && T) T.insertAdjacentHTML("beforeend", '<p class="pausenote" id="pauseNote" role="status">Paused. Press P or Resume to carry on.</p>');
  if (!U.paused && n) n.remove();
}
const _endWindow = endWindow;
endWindow = function () { U.paused = false; showPause(); _endWindow(); };
function helperKey(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (!U.cmd && (k === "?" || k === "/")) { e.preventDefault(); openKeys(); return; }
  if (G.phase !== "trade" || U.view !== "game" || !$("saved").hidden || !$("rulesO").hidden || !$("keysO").hidden || !$("profO").hidden || !$("achO").hidden || !$("boardO").hidden) return;
  const c = U.cmd;
  if (!c && k === "p") { e.preventDefault(); U.paused ? resumeWindow() : pauseWindow(); return; }
  if (U.paused) return;
  if (!c) {
    if (k === "b") U.cmd = { mode: "bid", amt: "" };
    else if (k === "a") U.cmd = { mode: "ask", amt: "" };
    else if (k === "f") U.cmd = { mode: "f", amt: "" };
    else return;
  } else if (c.mode === "ask" && c.s == null && k === "a") c.mode = "sell";
  else if (c.mode === "f" && k === "f") c.mode = "buy";
  else if (c.s == null && k in SUITKEY && c.mode !== "f") c.s = SUITKEY[k];
  else if (c.s != null && (c.mode === "bid" || c.mode === "ask") && /^[0-9.]$/.test(k)) c.amt += k;
  else if (k === "Backspace") { if (c.amt) c.amt = c.amt.slice(0, -1); else if (c.s != null) c.s = null; else U.cmd = null; }
  else if (k === "Enter" && c.s != null) {
    const err = c.mode === "bid" || c.mode === "ask" ? postQuote(c.s, c.mode === "bid" ? "bids" : "asks", c.amt) : takeTrade(c.s, c.mode);
    if (err) { c.err = err; showCmd(); e.preventDefault(); return; }
    if (c.mode === "buy" || c.mode === "sell") U.keyTraded = true;
    U.cmd = null;
  } else { e.preventDefault(); return; }
  if (U.cmd) U.cmd.err = "";
  e.preventDefault(); showCmd();
}
function showCmd() {
  const el = $("cmd"); if (!el) return; const c = U.cmd;
  if (!c) { el.hidden = true; el.innerHTML = ""; return; }
  const verb = { bid: "Bid", ask: "Offer", sell: "Sell", buy: "Buy", f: "f…" }[c.mode];
  const suit = c.s != null ? `${sv(c.s, RED[c.s] ? "red" : "blk")} ${SUITS[c.s]}` : `<span class="ph">suit: s c h d</span>`;
  const amt = c.mode === "bid" || c.mode === "ask" ? (c.s == null ? "" : c.amt ? `<b>${esc(c.amt)}</b>` : `<span class="ph">price</span>`) : "";
  el.hidden = false;
  el.innerHTML = `<span class="v">${verb}</span>${c.mode === "f" ? `<span class="ph">f again to buy</span>` : `${suit} ${amt}`}<kbd>Enter</kbd><span class="ph">Esc to clear</span>${c.err ? `<span class="e">${esc(c.err)}</span>` : ""}`;
}

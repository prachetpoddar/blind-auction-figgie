// Builds the application write-up as .docx (US Letter); the PDF is rendered afterwards with LibreOffice.
// Every result figure is read from the seeded series files, not typed by hand.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, LevelFormat, BorderStyle, ImageRun, Footer, PageNumber,
} = require("docx");

const A = JSON.parse(fs.readFileSync(__dirname + "/../results/results.json")).results;
const B = JSON.parse(fs.readFileSync(__dirname + "/../results/results_v19.json")).results;
const IV = Object.fromEntries(fs.readFileSync(__dirname + "/../results/infovalue.txt", "utf8").trim().split("\n").map(l => l.split(" ")));
const R = (src, c, m) => src[c][m];
const sgn = x => (x >= 0 ? "+" : "−") + Math.abs(x).toFixed(1);
const net = (src, c, t, m = "mixed") => sgn(src[c][m][t].net);
const ci = (src, c, t, m = "mixed") => `${sgn(src[c][m][t].net)} ± ${(1.96 * src[c][m][t].se).toFixed(1)}`;
const pct = (src, c, t) => `${Math.round(100 * src[c].mixed[t].top)}%`;
const paid = (src, c, t, m = "mixed") => src[c][m][t].paid.toFixed(1);
const pair = (c, a, b) => { const r = B[c].mixed["pair:" + a + "-" + b]; return `${sgn(r.net)} ± ${(1.96 * r.se).toFixed(1)}`; };
const nOf = (src, c, t) => "about " + (Math.round(src[c].mixed[t].n / 1000) * 1000).toLocaleString("en-US");
// rounds simulated: a mixed round records four styles; a focal round records one
const rounds = src => Object.values(src).reduce((a, modes) => a + Object.entries(modes).reduce((x, [m, rows]) =>
  x + Object.entries(rows).filter(([k]) => !k.startsWith("pair:")).reduce((y, [, r]) => y + r.n, 0) / (m === "mixed" ? 4 : 1), 0), 0);
const TOTAL = Math.round((rounds(A) + rounds(B)) / 1000) * 1000;
const topRange = () => { const v = ["Info-hungry", "Equilibrium", "Bluffer"].map(t => Math.round(100 * B.v19_final.mixed[t].top)); return `${Math.min(...v)} to ${Math.max(...v)}%`; };

const FONT = "Calibri", INK = "1F3864";
const run = t => (typeof t === "string" ? new TextRun({ text: t, font: FONT, size: 21 }) : t);
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 110, line: 272 }, ...opts, children: [].concat(text).map(run) });
const b = t => new TextRun({ text: t, font: FONT, size: 21, bold: true });
const i = t => new TextRun({ text: t, font: FONT, size: 21, italics: true });
const mono = t => new TextRun({ text: t, font: "Consolas", size: 18 });
const h = text => new Paragraph({ spacing: { before: 240, after: 90 }, keepNext: true, keepLines: true,
  children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: INK })] });
const h2 = (text, brk = false) => new Paragraph({ spacing: { before: 150, after: 60 }, keepNext: true, keepLines: true, pageBreakBefore: brk,
  children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: "2F4F7F" })] });
const bullet = (text, ref = "bullets") => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 50, line: 272 }, children: [].concat(text).map(run) });
const caption = text => new Paragraph({ spacing: { before: 50, after: 160 }, children: [new TextRun({ text, font: FONT, size: 17, italics: true, color: "555555" })] });
function table(header, rows, widths0, opts = {}) {
  const tot = widths0.reduce((a, c) => a + c, 0), widths = widths0.map(w => Math.round(w * 9840 / tot));
  widths[widths.length - 1] += 9840 - widths.reduce((a, c) => a + c, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (text, k, head, hi) => new TableCell({
    width: { size: widths[k], type: WidthType.DXA }, borders,
    shading: head ? { type: ShadingType.CLEAR, fill: "DCE3EE", color: "auto" } : hi ? { type: ShadingType.CLEAR, fill: "F2F5EA", color: "auto" } : undefined,
    margins: { top: 45, bottom: 45, left: 80, right: 80 },
    children: [new Paragraph({ alignment: k === 0 || opts.left ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text, font: FONT, size: 18, bold: head })] })],
  });
  return new Table({
    width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: header.map((t, k) => cell(t, k, true)) }),
      ...rows.map((r, j) => new TableRow({ cantSplit: true, children: r.map((t, k) => cell(t, k, false, (opts.hi || []).includes(j))) }))],
  });
}
const img = (path, w, hgt) => new Paragraph({ spacing: { before: 80, after: 40 }, alignment: AlignmentType.CENTER,
  children: [new ImageRun({ type: "png", data: fs.readFileSync(path), transformation: { width: w, height: hgt } })] });

const STY = ["Info-hungry", "Equilibrium", "Bluffer", "Cautious", "Naive"];
const row5 = (label, src, c) => [label, ...STY.map(t => net(src, c, t))];
const V19 = "v19_final";
const children = [
  new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "Blind Auction Figgie", font: FONT, size: 36, bold: true, color: INK })] }),
  new Paragraph({ spacing: { after: 50 }, children: [new TextRun({ text: "Pricing information in a market game: the playable game, how it works, and how I tested it", font: FONT, size: 22, italics: true, color: "404040" })] }),
  new Paragraph({ spacing: { after: 180 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 6 } },
    children: [new TextRun({ text: "Prachet Poddar  |  UCLA, B.S. Physics and B.S. Mathematics (expected June 2028)  |  October 2026", font: FONT, size: 17, color: "555555" })] }),

  h("1. Summary"),
  p("Figgie is a card game about trading when the deck is uncertain. All of its information is free: you see your own hand and learn the rest from other players' trades. Real traders often pay for information before they know what it will say, and the act of paying can give away their position. Blind Auction Figgie adds that decision. Before each trading window, every player can buy information at a sealed-bid data desk, and everyone sees who bought what and at what price, but not what the buyer saw."),
  p(["I built it as a playable web game against three bots, with a live market, saved games, a rating and a leaderboard. I then tested the rules with headless simulations that run the game's own bot code, about ", b(`${TOTAL.toLocaleString("en-US")} rounds`), " in a seeded, reproducible series. The design changed three times because of what the tests showed. An independent review of the simulator found one bug that changed the final balance. I fixed it and re-ran the series, and every number below comes from the fixed code unless marked otherwise."]),
  p([b("Result. "), `In the final rules, buying information pays, but nobody can buy their way to a large edge. Across ${nOf(B, V19, "Equilibrium")} rounds per style in mixed tables, the heaviest buyer (Info-hungry) finishes ${pair(V19, "Equilibrium", "Info-hungry").replace("−", "")} chips a round ahead of the value-based bot (Equilibrium) at the same tables, and Equilibrium finishes ${pair(V19, "Cautious", "Equilibrium").replace("−", "")} ahead of a bot that never buys. Three styles each finish top in ${topRange()} of their rounds.`]),

  h("2. The game"),
  bullet("Standard Figgie deck and payout, four players. 40 cards: one suit has 12, one has 8 and two have 10. The goal suit is the other suit of the same colour as the 12-card suit. Everyone antes 50 of 350 chips, so the pot is 200. At the end each goal-suit card pays 10 and the player holding the most goal-suit cards takes the rest of the pot, split on ties."),
  bullet("Four trading windows of 60 seconds. Players post bids and offers, or trade at the best price. One card changes hands per trade, and any trade cancels all of your resting quotes (Figgie's rule)."),
  bullet([b("The data desk "), "opens before each window and sells four widgets, each in its own sealed auction with a house reserve:"]),
  table(["Widget", "What the buyer sees", "Lots", "Reserve"], [
    ["Peek", "One random card from a random opponent, never one already shown to you", "2", "0.5"],
    ["Scan", "Five random cards from the opponent you pick", "1", "1.5"],
    ["X-ray", "The opponent's whole hand, kept current through the public trade tape", "2", "3"],
    ["Tracker", "A live grid of every player's net buys and sells (an aid for people; bots already track the tape)", "1", "5"],
  ], [1300, 5900, 700, 900], { left: false }),
  caption("Table 1. The desk. Each lot goes to the highest sealed bids; every winner pays the clearing price, which is the best losing bid or the reserve, whichever is higher."),
  bullet("Payments go to the house, so the players as a group always lose exactly what they spend. Information moves chips between players; it creates none. A purchase can only beat its cost at the other players' expense."),
  bullet("After each desk everyone sees the buyers, whose hand each Scan or X-ray targeted, and the prices. Only the buyer sees the cards. A player may then say what it saw, truthfully or not."),
  img(__dirname + "/fig_desk.png", 600, 328),
  caption("Figure 1. The data desk in the playable game, with bids entered for two peeks, a Scan of Marlow, an X-ray of Ines and the tracker."),

  h("3. The mechanism"),
  h2("What each player knows"),
  p("There are 12 possible deck layouts: 4 choices for the 12-card suit times 3 for the 8-card suit. Each bot keeps a probability for every layout. It starts from the likelihood of its own hand, which is multivariate hypergeometric in the layout's suit counts, and updates by Bayes' rule on everything it observes:"),
  bullet([b("Desk reveals. "), "Seeing suit counts v among the cards it cannot see multiplies each layout's weight by the hypergeometric probability of v given the unseen counts. An X-rayed hand is then kept exact through the public tape."]),
  bullet([b("Trades. "), "When a player starts a trade by buying suit s, layouts where s is the goal gain weight; selling lowers it. The factors were measured in an earlier research simulator: about 1.7 for a buy and 1.17 for a sale by a player who just bought data, and 0.59 and 0.81 (that is, the opposite direction) for a player who did not. Reading trades the wrong way round was one of the early bugs that controls caught (section 5)."]),
  bullet([b("Claims. "), "A claim that a peeked card was suit s is mixed in with a trust weight t, from 0 (ignored) to 0.5 (Naive)."]),
  h2("The value of information"),
  p("I measure information in accuracy points: one point is one percentage point added to the chance of naming the goal suit correctly. From a player holding 10 cards, each additional unseen card adds close to one point, so the old yes/no answer about a suit carried about as much as 18 more cards:"),
  table(["Information", "1 card", "3 cards", "5 cards", "10 cards (X-ray)", "20 cards", "Old answer: \"Is X the 12?\""],
    [["Accuracy points", ...["1", "3", "5", "10", "20"].map(k => (+IV[k]).toFixed(1)), (+IV.ans).toFixed(1)]], [1700, 900, 900, 900, 1500, 1000, 2000]),
  caption("Table 2. Expected gain in the probability of naming the goal suit, ×100, from the opening position, 20,000 sampled deals."),
  p("A bot converts points to chips at a rate of 0.75, 0.64, 0.53 and 0.49 chips per point in windows 1 to 4, measured earlier by replaying identical deals with and without information delivered. Its bid for a widget is that chip value times a style multiplier. One and two cards are valued exactly; Scans and X-rays by sampling 48 outcomes."),
  h2("How bots trade"),
  p("A bot's value for one more card of suit s is 10 times the probability that s is the goal, plus the expected change in its share of the majority bonus. The bonus term comes from 40 sampled layouts and deals of the unseen cards to opponents. It quotes 6 chips either side of that value, takes any quote that beats its value by more than 1 chip, and quotes recent data buyers the value it would have after their trade, as a market maker widens against informed flow. In the final rules, bots that buy data also blend in a value that holds X-rayed hands fixed, at weight 0.2 or 0.3. Every bot acts at the same rate: one random bot acts each second."),
  table(["Style", "Buys data", "Reads trades", "Talks", "X-ray use in values"], [
    ["Equilibrium", "At its value", "Yes, and protects", "Says nothing", "0.2"],
    ["Info-hungry", "At 1.5 times its value", "Yes, and protects", "Says nothing", "0.3"],
    ["Bluffer", "At its value", "Yes, and protects", "Lies about peeks; ignores claims", "0.2"],
    ["Cautious", "Never", "Yes, and protects", "Says nothing", "None"],
    ["Naive", "At its value", "No; quotes tight", "Tells the truth; believes claims", "0.2"],
  ], [1500, 1900, 1900, 2400, 1460]),
  caption("Table 3. The five bot styles. Each is one parameter change away from a shared core."),

  h("4. Tests"),
  p(["All runs use four bot seats. A ", i("mixed"), " round draws four of the five styles at random, so every style meets the other four equally often. Two further fields put one focal bot (Equilibrium or Info-hungry) against weak opponents (Cautious, Naive, Bluffer) or strong ones (Cautious, Bluffer, Equilibrium). Seeds are fixed, so every run reproduces exactly. Intervals are 95%. Differences between two styles are measured at the same tables, as the mean of the paired difference."]),
  h2("Stage 1: research simulator"),
  p("Before writing the game, I built a separate Python simulator with eight bot styles to test the rules on paper. Its main findings, which the game kept, were: a bot that trades faster after winning information wins only because the tick market gives it extra turns; bids reveal hands, so coarse bidding is the right response when bids are public; and letting players watch an auction for free rewards never bidding, which a pay-to-watch rule fixed. That rule set, a sealed auction for the answer to \"Is suit X the 12-card suit?\", became the first version of the web game."),
  h2("Stage 2: the answer auction in live play"),
  p([`In the web game the answer auction let one style dominate. With the chip rates the game shipped with, Info-hungry led every mixed table at ${ci(A, "v3_live_kappa", "Info-hungry")} chips a round and finished top in ${pct(A, "v3_live_kappa", "Info-hungry")} of its rounds. The lead depends on the chip rate. The research simulator had found that the right bid is about 1.33 times the plain value of an answer, because a rival who wins it also costs you; at the game's rates, Info-hungry's 1.5× sits near that price. Under an earlier calibration with rates about a third higher, every honest bid rises and the lead disappears (${net(A, "v3_calibrated_kappa", "Info-hungry")} against Equilibrium's ${net(A, "v3_calibrated_kappa", "Equilibrium")}).`]),
  p("Playing it showed a second problem that calibration cannot fix. One answer carries 22 accuracy points, as much as seeing about 18 extra cards. A single \"no\" rules out a goal suit and a \"yes\" settles the round, so after one or two answers the game reduces to trading two suits. I replaced the answer with the data desk, which sells evidence in pieces of 1, 5 and 10 cards."),
  h2("Stage 3: the data desk"),
  table(["Version", "Change", ...STY], [
    ["v3 answer auction", "As shipped", ...STY.map(t => net(A, "v3_live_kappa", t))],
    ["V16 desk*", "First desk; bots bid half value", ...STY.map(t => net(A, "v16_desk", t))],
    ["V17 desk*", "Info-hungry uses X-rays", ...STY.map(t => net(A, "v17_ih_blend", t))],
    ["V18 desk*", "Cheaper X-rays; all buyers use them", ...STY.map(t => net(A, "v18_final", t))],
    ["V19 final", "Peek bug fixed; bots bid full value", ...STY.map(t => net(B, V19, t))],
  ], [1450, 2600, 1100, 1100, 900, 1000, 900], { hi: [4] }),
  caption("Table 4. Net chips per round by style, mixed tables, 4,000 to 8,000 rounds per cell (intervals ±0.9 to 1.6). * Run before the bug in section 5 was fixed."),
  p("V16 removed Info-hungry's lead but made information nearly useless: Cautious, which never buys, tied the buyers. Bots rarely met the X-ray reserve, and what they bought hardly changed their prices. V17 gave Info-hungry alone a way to use X-rayed hands; the change looked like a gain in a first, unseeded run and did not replicate in the seeded series. V18 lowered the X-ray price, added a second lot and let every buyer use X-rayed hands, which moved Cautious behind the buyers in both my own play and the simulation."),
  img(__dirname + "/fig1.png", 620, 286),
  caption("Figure 2. Net chips per round with 95% intervals: the answer auction, the first desk and the final desk."),
  h2("Final rules (V19)"),
  table(["Style", "Net per round", "Rounds finished top", "Paid for data"], STY.map(t => [t, ci(B, V19, t), pct(B, V19, t), paid(B, V19, t)]), [2200, 2400, 2200, 2060]),
  caption(`Table 5. Final rules, mixed tables, ${nOf(B, V19, "Equilibrium")} rounds per style. With five styles at four seats, equal styles would each finish top in about 25% of their rounds.`),
  table(["Comparison at the same tables", "Paired difference"], [
    ["Info-hungry minus Equilibrium", pair(V19, "Equilibrium", "Info-hungry").replace(/^./, c => c === "−" ? "+" : "−")],
    ["Equilibrium minus Cautious (does buying data pay?)", pair(V19, "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
    ["Bluffer minus Cautious", pair(V19, "Bluffer", "Cautious")],
    ["Bluffer minus Equilibrium (lying about peeks)", pair(V19, "Bluffer", "Equilibrium")],
    ["Cautious minus Naive (reading trades and quoting wide)", pair(V19, "Cautious", "Naive")],
  ], [5800, 3060]),
  caption("Table 6. Chips per round, 95% intervals, over the 6,000 or so rounds in which both styles sat."),
  p([`Against weak opponents Equilibrium and Info-hungry tie (${net(B, V19, "focal:Equilibrium", "field")} and ${net(B, V19, "focal:Info-hungry", "field")}). Against strong readers Info-hungry does better (${net(B, V19, "focal:Info-hungry", "readers")} against ${net(B, V19, "focal:Equilibrium", "readers")}), probably because buying more data is how a bot keeps up with players who read the tape well. Naive loses heavily in every field: it believes every claim, announces what it saw, and quotes tight against informed traders.`]),
  h2("Design checks on the final rules", true),
  table(["Setting", "Info-hungry", "Equilibrium", "Cautious", "Equilibrium minus Cautious"], [
    ["Bots bid half the value of data", net(B, "v19_bidscale_0.5", "Info-hungry"), net(B, "v19_bidscale_0.5", "Equilibrium"), net(B, "v19_bidscale_0.5", "Cautious"), pair("v19_bidscale_0.5", "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
    ["Bots bid full value (final)", net(B, V19, "Info-hungry"), net(B, V19, "Equilibrium"), net(B, V19, "Cautious"), pair(V19, "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
    ["Bots bid 1.25 times value", net(B, "v19_bidscale_1.25", "Info-hungry"), net(B, "v19_bidscale_1.25", "Equilibrium"), net(B, "v19_bidscale_1.25", "Cautious"), pair("v19_bidscale_1.25", "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
    ["No bot uses X-rayed hands in its values", net(B, "v19_no_xray_use", "Info-hungry"), net(B, "v19_no_xray_use", "Equilibrium"), net(B, "v19_no_xray_use", "Cautious"), pair("v19_no_xray_use", "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
    ["Every bot relies fully on X-rayed hands", net(B, "v19_full_known_hand", "Info-hungry"), net(B, "v19_full_known_hand", "Equilibrium"), net(B, "v19_full_known_hand", "Cautious"), pair("v19_full_known_hand", "Cautious", "Equilibrium").replace(/^./, c => c === "−" ? "+" : "−")],
  ], [3300, 1300, 1300, 1200, 1760], { hi: [1] }),
  caption("Table 7. Mixed tables, 3,000 to 8,000 rounds per style in each row. Only the changed setting differs from the final rules."),
  p("Three points follow. First, at half value data is underpriced and the heaviest buyer takes a large edge; at 1.25 times value the desk prices away the gain from buying and Cautious ties the buyers again, so full value is the setting where buying is a real decision. Second, information only pays when it changes how a bot trades: if no bot uses X-rayed hands, Equilibrium is no better than Cautious. Third, full reliance on a known hand loses badly, most of all for the heaviest X-ray buyer. Holding X-rayed hands fixed treats the race for the majority bonus as static, but the other players keep trading for the same cards. A partial weight is the better estimate."),

  h("5. What the controls caught"),
  p("Several results did not survive a control. Each one changed the design, so I list them here:"),
  table(["Apparent finding", "Control", "What it really was"], [
    ["Overbidding for answers wins", "Speed boost given with and without an answer", "Extra turns in my market model, not information"],
    ["Overbidding still pays", "Measured how much each trade reveals", "Bots were reading uninformed trades backwards"],
    ["Info-hungry dominates the web game", "Reran at a second chip-rate schedule", "Its 1.5× overbid sat near the right price at the game's rates"],
    ["V17 makes Info-hungry stronger", "Seeded rerun at full size", "Noise; it did not replicate"],
    ["V18 is balanced", "Independent review of the simulator", "A bug: 26% of peeks drew from hands already X-rayed"],
    ["Bots should value known hands exactly", "Full reliance against a partial weight", "The static estimate overstates the majority race"],
  ], [2900, 3000, 2960], { left: true }),
  caption("Table 8. Each row was settled by a paired test on identical deals, or by a seeded rerun."),
  p("The last bug matters most for this document. A Peek could land on a hand the buyer had already X-rayed, so the buyer paid for a card it already knew and its beliefs counted that card twice. With the bug fixed, data became far more valuable, Info-hungry reached +9.4 a round at the old half-value bids, and the balance I had accepted turned out to depend on the bug. The fix took one line, a regression test that fails on the old code, and a recalibration from half-value to full-value bids."),

  h("6. Limits"),
  bullet("The bots are assumptions about how people play, not measurements. The results show how these five styles fare against each other, in a field where Naive sits at three of every four tables."),
  bullet("The market is a simple tick model: one random bot acts each second, and the live game has one human seat. Results that depend on fine trading details are the least certain."),
  bullet("Bots value Scans and X-rays from 48 samples, so their bids carry noise of about 1.3 and 1.8 points. Auction winners therefore pay slightly more than the data's value to them."),
  bullet("Human play so far is my own. The next step is a playtest with other people, for which the game already saves every round, bid and trade."),

  h("7. Reproducing the results"),
  p([mono("python3 sim/run_series.py"), run(" runs rules v3 to V18, and "), mono("SERIES=v19 OUT=results_v19.json python3 sim/run_series.py"), run(" runs the final rules, about 25 minutes each on two cores. The simulators load the game's own bot code. "), mono("node tools/test_reveal.js"), run(" is the regression test for the peek bug, and six browser test suites check the game at phone and desktop widths. The playable game, code and logs are available on request.")]),
];

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: "888888" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log("wrote", process.argv[2]); });

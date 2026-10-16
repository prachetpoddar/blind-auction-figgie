# Blind Auction Figgie

A four-player variant of [Figgie](https://www.figgie.com), the card game about trading under uncertainty, in which players can **pay for information** before each trading window. Every player sees who bought what and at what price, but only the buyer sees the cards. The question the game asks is when information is priced right, and what buying it gives away.

This repository holds the playable game, the simulators that test its rules with the game's own bot code, every result, and a five-page write-up ([`Blind_Auction_Figgie.pdf`](Blind_Auction_Figgie.pdf)).

## Play

**[Play it here](https://prachetpoddar.github.io/blind-auction-figgie/)** against three bots. The game is a single HTML page, [`docs/index.html`](docs/index.html), served by GitHub Pages. Saved games, the rating and the leaderboard need the page's original hosting and switch themselves off here; the game, the bots and the data desk all work.

## The rules in brief

- Standard Figgie deck and payout: 40 cards (one suit of 12, one of 8, two of 10), a pot of 200 from 50-chip antes, 10 per goal-suit card and the rest of the pot to the largest holder of the goal suit.
- Four trading windows of 60 seconds. Any trade cancels all of your resting quotes.
- Before each window a **data desk** sells, by sealed-bid auction with a house reserve: a **Peek** (one random card from a random opponent), a **Scan** (five cards from an opponent you pick), an **X-ray** (an opponent's whole hand, kept current through the trade tape) and a **Tracker** (a live grid of every player's buys and sells). Winners pay the clearing price. All payments go to the house.

## Results

Final rules, seeded simulation, mixed tables of four bots drawn from five styles, about 8,000 rounds per style (95% intervals):

| Style | Net chips per round | Rounds finished top | Paid for data |
| --- | --- | --- | --- |
| Info-hungry | +1.5 ± 1.3 | 35% | 21.1 |
| Equilibrium | −2.0 ± 1.2 | 28% | 9.8 |
| Bluffer | −3.1 ± 1.2 | 27% | 9.9 |
| Cautious | −5.1 ± 1.1 | 19% | 0.0 |
| Naive | −43.9 ± 1.5 | 16% | 11.6 |

At the same tables, Info-hungry beats Equilibrium by +4.2 ± 2.3 chips a round, and Equilibrium beats Cautious, which never buys, by +3.9 ± 2.1. Buying information pays, but nobody can buy a large edge.

Under the original rules, which auctioned a yes/no answer about the deck, Info-hungry led every table at +8.5 ± 1.2 a round. One answer carried as much as seeing about 18 more cards. The write-up explains how the design got from there to here, including the controls that overturned early results and a bug that an independent review found in the simulator.

## Layout

| Path | Contents |
| --- | --- |
| `src/` | The game: `logic.js` (deck model, Bayesian bots, game flow), `desk.js` (the data desk), `ui.js` and `ui.css` (interface), `page.html` (markup), `build.py` (assembles everything into one page), `tools/` (texture and card-back generators) |
| `docs/index.html` | The built game, ready for GitHub Pages |
| `sim/` | Headless simulators that load the game's bot code (`sim_auction.js` for the old rules, `sim_desk.js` for the desk), the seeded runner `run_series.py`, `check_reproduction.py`, `infovalue.js` and `legacy/` (the code as it was for the earlier rule sets) |
| `results/` | `results.json` (rules v3 to V18), `results_v19.json` (final rules), `infovalue.txt` |
| `tests/` | `test_reveal.js` (regression test for the peek bug) and `test_desk.py` (a full round in a headless browser) |
| `writeup/` | `build.js` and `chart.py`, which build the PDF from the results files |
| `DESIGN.md` | The design log for every version |

## Reproduce

Needs Node 18 or later and Python 3. The browser test also needs Playwright with Chromium.

```bash
python3 sim/check_reproduction.py v19_final mixed     # reruns one stored cell (about 3 minutes) and compares
SERIES=v19 OUT=results_v19.json python3 sim/run_series.py   # final rules, about 25 minutes on 2 cores
python3 sim/run_series.py                              # rules v3 to V18
node sim/infovalue.js                                  # information value table
node tests/test_reveal.js                              # passes on the current code
DESK_SRC=../sim/legacy/desk_v18.js node tests/test_reveal.js   # fails on the V18 code, as it should
python3 tests/test_desk.py 1440 900 dk                 # one full round in a headless browser
python3 src/build.py                                   # rebuild docs/index.html from src/
node writeup/build.js Blind_Auction_Figgie.docx        # rebuild the write-up (needs the docx package)
```

Every run is seeded, so the same command gives the same numbers.

## How this was built

I designed the game, its rules and the experiments, and made the design calls at each stage. Much of the code was written with Claude, an AI assistant, working from my direction.

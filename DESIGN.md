# Blind Auction Figgie: Card Room, live game (Version 15)

This version replaces the B8 notes. It applies the UI audit of October 15 in full. The design read behind every choice: **a quiet card room where the only loud objects are sealed envelopes and the money you can take.**

## What changed from B8

| Area | B8 | Now |
| --- | --- | --- |
| Palette | Navy room, blue felt, brass on every main action | Green baize, oxblood wax, paper; brass marks only you |
| Materials | Walnut, felt, linen, manila, wax, brass inlay | Felt and paper, plus wax on sealed envelopes; the rim is a flat dark band |
| Players | Bot A, Bot B, Bot C in letter discs | Marlow, Ines and Hollis, each with its own Figgie colour |
| Card backs | An oxblood lattice | Off-white stock with three maze glyphs in three Figgie colours |
| Controls | Rounded corners, flat | Square corners with a thin, crisp shadow contour |
| Layout, desktop | Table on the left, a 440px panel on the right | The table is the stage; a rail in front of your seat holds what you act on |
| Layout, phone | The oval shrunk to a pill | A strip of three opponents, then your hand and the action |
| Your hand | Playing cards with a corner index | Suit tiles with a large count |
| Motion | 16 animations, waits of 2 to 2.5s | Three moves, nothing blocks input for more than 800ms |
| Copy | A caption on every state | At most one explanatory sentence per screen; full rules in a Rules sheet |

## Colour

Colour is still a game rule on the face of play: red belongs to Hearts and Diamonds. Sell and buy differ by side, fill and verb, never by red and black. The one place red appears otherwise is on face-down card backs (see Card backs).

| Token | Hex | Use |
| --- | --- | --- |
| room | #0f1d17 | Page ground |
| side | #0a1611 | Table rim, seat plates, the rail |
| felt, feltHi, feltLo | #1f4a36, #2b6649, #163627 | Table surface, lit from the middle, under a felt texture (see Materials) |
| paper, paper2, paper3 | #f1efe7, #e4e2d8, #d2d0c4 | Sheets, tiles, buttons, sell tiles, quiet fields |
| ink, ink2 | #16201b, #47524c | Text on paper, buy tiles, errors |
| chalk, chalk2 | #eef1ec, #b7c7bd | Text on felt and room |
| brass | #d8a63f | You only: your seat disc, your bid mark, your quote outline, chips going up |
| tint | #f4e4b9 | Your rows in tables, your waiting quotes |
| red | #b3202b | Hearts and Diamonds |
| wax | #8c1d26 | Wax seals on envelopes |
| p1 (Marlow) | #2f5fae | Blue: Marlow's disc and monogram |
| p2 (Ines) | #2f9e78 | Green: Ines's disc and monogram |
| p3 (Hollis) | #e07b3c | Orange: Hollis's disc and monogram |
| figgie red | #d9434b | Card backs only |
| manila | #d9c08a | Envelopes |

## Materials

- **Felt.** A tileable 512px wool texture made in code : fine fuzz, 26,000 short fibres lying mostly one way for a light nap, and a faint drift in density. It is grey around mid-tone and sits over the green with `background-blend-mode: overlay`, so the colour tokens stay in charge and the lamp light still falls from the middle. It covers the table, the bid and result stages, the phone strip and the saved-games pane, tiled at 320px.
- **The room.** The same wool in two offset layers over the dark room colour, so the page reads as cloth too. The table rim and the rail stay flat, which keeps the table edge clear.
- **Paper.** Linen on sheets and tiles, manila on envelopes.
- **Wax.** On sealed envelopes.

## Card backs

The four card colours come from a photo of a physical Figgie deck: red #d9434b, blue #2f5fae, green #2f9e78 and orange #e07b3c, corrected for the photo's warm light against the card stock. The glyphs are original, drawn in code (`src/tools/make_mazeback.py`); they follow the spirit of the Figgie deck without copying it.

- **Card:** 40 by 56, off-white stock #f3f0ea, a thin grey rule inside the edge.
- **Panels by area:** a top band of 40% (40 by 22.4) and two bottom panels of 30% each (20 by 33.6), split by faint hairlines.
- **Glyphs:** each is a small maze (a random spanning tree on a grid) drawn as thick square strokes, with one added spiral leg that runs out of the maze, turns twice and curls back in.
  - Top: a 6 by 2 maze plus a leg through two more rows.
  - Bottom: the same 3 by 3 maze in both panels plus a leg below it; the left copy's maze is the right one turned 90 degrees counter-clockwise on its grid. Both copies share the same downward leg.
  - Square cells and one stroke weight (3.4) throughout. The gap between the top glyph and the bottom pair is 1.72 units.
- **Three colours per card:** the order [Red, Blue, Green, Orange] rotates one step per player, going clockwise from you. Each player takes three colours in a row for top, bottom left and bottom right:

| Player | Top | Bottom left | Bottom right |
| --- | --- | --- | --- |
| You | Red | Blue | Green |
| Marlow | Blue | Green | Orange |
| Ines | Green | Orange | Red |
| Hollis | Orange | Red | Blue |

- **Seat colour:** each bot's seat colour is its top-glyph colour. You keep brass. The deck on the start screen is ink-black.
- **Fans:** fan cards are 40 by 56 on a wide arc (8 degrees per card at the top seat, 6 at the sides), so a strip of each card's glyphs stays visible. Ines's fan hangs from the top rim; Marlow's and Hollis's sit along the sides below their seat plates. Dealt cards fly out wearing their seat's back.

## Type

- **Face:** Schibsted Grotesk only.
- **Scale (1.25):** 12, 14, 16, 20, 25, 31, 39, 49. Every rule uses one of these sizes.
- **Weights:**
  - 400 for body text.
  - 600 for labels and headings.
  - 800 for two things only: your chip count and the prices you can hit.
- **Figures:** tabular on every number that sits in a column or changes in place.
  - Schibsted widens the full stop under tabular figures, so the point is set in its own proportional run (`.dp`). Columns line up and "22.6" still reads as one number.
- **Decimals:** whole numbers show none (300, +20, 100). One decimal appears only where a fraction exists, as in quotes and second-price payments.

## Shape

- **Square corners** on everything you press or type into, and on paper: buttons, market tiles, fields, the bid stepper, sheets, cards, envelopes, the rail and the stages.
- **Round** only for discs, seat plates and the table.
- **Shadow contour on controls:** a 1px dark edge plus a crisp 2px shadow underneath, with no blur (`--contour` on dark grounds, `--contour-in` on paper). Pressing a control sinks it 2px onto its shadow.

There are no zebra stripes anywhere. Hairline rules separate rows only in the long tables: saved games and the bid review.

## Layout

### Margins

- **Page:** side margins of 7% of the window width, between 20 and 120px (about 100px at 1440 wide, 90px at 1280, 20px on a phone), with 20 to 36px above and 48px below.
- **Seat plates:** sit inside the table rim, 14px from its edge.

### Desktop

- **Header:**
  - The screen title.
  - The four suits in auction order, the current one underlined.
  - Your chips.
- **The table:**
  - Height is between 420 and 500px, set by the window height (100vh minus 400px) so trading fits at 1280 by 860.
  - Opponents sit at the left, top and right; you sit at the bottom.
  - The pot and timer are in the middle. The latest three trades run under them while a window is open.
- **In front of your seat, on the felt:**
  - Four envelope slots in auction order, then your hand.
  - An empty slot shows its suit; the current one is outlined.
  - A filled slot gives the key fact ("♦ Not 12, You paid 22.6"). Hover or focus shows the full record.
- **The rail below the table:**

| Phase | Columns |
| --- | --- |
| Start | Take a seat, Deal, Rules, Saved games |
| Bid | Envelope with the question; bid controls and watch scale; your counts and Seal |
| Result | The envelope (open, shut or face down); the outcome and Start window; the bids table |
| Trading | Market header with End window now; the four suits side by side |
| End | Your chips; the payout table; how each bot played, the bid review, Deal again |

### Phone (900px and below)

- **Header:** the title, the suits and your chips.
- **Opponent strip:** three seat cards, each with name, card count and last trade.
- **Under the strip:** the timer line and readout, then your hand.
- **"What you know":** a drawer holding the envelopes.
- **The action panel:** one column, heading first.

### Market tile

- Each suit has a name, your holding and a tag ("The goal suit", "Not 12 cards") when you know something.
- **Sell side:** the best bid's price, the bidder's monogram and "Sell to". Under it, your own bid field, or your waiting bid with Cancel.
- **Buy side:** the same, with the best ask and "Buy from".
- **Your own best quote:** a brass outline with Cancel.
- **A crossing price:** one dark error line under the suit.
- **Updates:** tiles update in place. The same button is kept and only its contents change, so a press that spans a quote change still lands.

## Motion

Three signature moves:

| Move | What you see | Time |
| --- | --- | --- |
| The seal | The question card slides into the envelope, the flap closes, the wax stamps | 0.7s; any click skips it |
| The opening | You won: the flap lifts and the answer card rises. You watched: the envelope stays shut with the winner's monogram. You saw nothing: it lies face down | 0.65s |
| The fill | A traded card flies from seller to buyer and the receiving seat bumps | 0.7s; never blocks input |

- **The deal:** 20 cards leave the deck in under 0.8s, and a click skips it.
- **Everything else** appears instantly.
- **The timer** is a line that drains along the table rim. Under 10 seconds the line and readout turn to paper; nothing pulses.
- **Reduced motion:** turns every animation and transition off. The seal wait drops to 50ms.

## Copy

- At most one explanatory sentence per screen. The full rules live in a Rules sheet, opened from the start rail or the end rail.
- Each fact appears once on screen. The envelope is the record.
- The voice is a dealer's: "Saw the answer", "Saw the bids", "Saw nothing"; "Your Hearts: 5. Your Diamonds: 1."
- The bot styles stay hidden until the end of the round. There each one lands as a line, for example "Hollis was the Bluffer. Bid backwards and lied about what it heard."
- The save notice appears only on the end screen.
- No dashes in visible text.

## Accessibility

- **Contrast:** text is 4.5:1 or better on felt, room and paper.
- **Focus rings:** brass on dark grounds, ink on paper.
- **Spoken names:**
  - Every market tile names the suit, price and counterparty, for example "Buy 1 Diamond at 9.7 from Hollis".
  - Each envelope slot reads its full record.
- **Live regions:**
  - Errors are alerts.
  - The trade list is a polite live region. On each screen size only one copy is visible, so trades are announced once.
- **Timer:** it has the seconds in its label.
- **Targets:** 40px or larger.

## Figgie features (Versions 13 and 14)

These match what figgie.com offers, as listed in its how-to-play guide, FAQ and app release notes. Multiplayer-only features (lobbies, spectating, private tables, regions) don't apply to a game against bots.

### At the table

- **Modes:** chosen on the start rail. Standard has four 60-second windows. Learning has four 5-minute windows, with the bots' hands either face up and updating live, or hidden. Learning rounds are saved with their mode.
- **Ante screen:** after the deal, your bank of 350, the 50 ante, the 300 you start with and the 200 pot, with your hand in front of you. Open the data desk moves on.
- **Helper keys:** `b` or `a` + suit (`s` `c` `h` `d`) + price + Enter posts a bid or offer; `ff` or `aa` + suit + Enter buys or sells at the shown price; Backspace undoes a key, Esc clears, `p` pauses, `?` or `/` opens the key list. A strip at the top shows what has been typed, and any error.
- **Penny buttons:** ▲ beside each best bid and ▼ beside each best offer post a price one tick (0.1) better. Each is disabled where the new price would cross or can't be afforded.
- **Figgie's quote rule:** any trade cancels all of your resting quotes in every suit, and a note says how many were cleared. Each cancellation is logged with the reason "trade".
- **All trades:** the full list for the round, with window and time.
- **Pause:** Pause/Resume beside End window now, or `p`. It stops the window's clock, so the bots stop too, and freezes the market. End window now still works while paused.

### After the round

- **Review the round:** step from the deal through every trade; the table shows every hand at that moment.
- **Standings:** cumulative net across rounds against the same bots, as Figgie ranks by cumulative bank. "Rematch, same bots" keeps them; "New bots" resets them.
- **Stats:** the Saved games sheet opens with rounds played, total and average net, best round, rounds in profit and chips paid for data.

### Profile and achievements

- **Header:** a trophy button with the count (for example 3/12) and your avatar and display name. Both open sheets.
- **Profile:** a display name (up to 18 characters), a colour from brass, red, blue, green and orange, one of six maze-glyph avatars and a frame. The name appears on your seat plate and in the payout and standings tables; sentences still say "You". A frame draws a ring round your seat disc.
- **Unlocks:** avatars 4 to 6 unlock at 2, 5 and 8 achievements. Frames unlock at 3 (Bronze), 6 (Silver), 9 (Gold) and 12 (Maze).
- **Twelve achievements**, checked when a round ends: First hand, In the money, The bonus, Data buyer (win a desk lot), Full picture (buy at all four desks), Free rider (finish ahead without buying data), Market maker (three of your quotes taken in a round), Keyboard trader (a trade with the helper keys), Penny pincher (five pennies), Study hall (a Learning round), Hot streak (ahead three rounds running) and Regular (ten rounds). The ones that count show progress, such as "3 of 10 rounds".
- **On unlock:** a notice names the achievement and anything it unlocked, and the trophy button pulses gold three times.
- **Storage:** for a signed-in viewer, the profile is saved at `games/<id>/meta/profile`, beside their rounds, under the same rule that keeps it private. It is also kept in the browser, which is the only copy for a guest. When both exist, the higher counters and every unlock from either are kept.

### Rating, leaderboard and daily streak (Version 15)

- **Rating:** Elo-style, starting at 1000. Each Standard round counts as three games, one against each bot, with every bot rated 1000. Finishing ahead of a bot on net scores 1, level scores 0.5, behind scores 0, with K = 24. Learning rounds don't change the rating, as on Figgie, but count as rounds played. The end screen shows the new rating and the change.
- **Leaderboard:** opened from the rating button in the header. It has two periods (This week, All time) and two rankings (Rating, Rounds played); the weekly rating board ranks by rating gained this week. It shows the top 50, and your own row is pinned below them when you're further down, so your placement always shows. Weeks are ISO weeks.
- **Daily streak:** each day with a finished round extends the streak, and a missed day resets it to 1, keeping the best. The header chip levels up at 7 days (brass outline) and 30 days (filled brass), as Figgie's badge levels up at 7.
- **Storage and rules:** each player's entry is `board/<id>`, written after every round and whenever the name or avatar changes. Rules: `board` can be read by everyone who can open the page and written only by the owner; `board/{self}` can be written by its own player at Contributor level. Saved rounds and profiles under `games/{self}` stay private. Names and avatar fields from other players are checked and set as text only.
- **Sharing:** the page is private until it's shared from the Share menu. A leaderboard only fills once other people can open it with Contributor access.

## Rules v4: the data desk (Version 16)

The sealed long-suit auction is gone. One answer carried about 22 accuracy points (as much as seeing two whole opponent hands), so it outweighed trading skill. Before each window the data desk sells:

| Widget | Shows | Lots | House reserve |
| --- | --- | --- | --- |
| Peek | 1 random card from a random opponent, never one already shown to you | 2 | 0.5 |
| Scan | 5 random cards from the opponent you pick | 1 | 1.5 |
| X-ray | the opponent's whole hand, kept current through the public tape | 2 | 3 |
| Tracker | live grid of net buys and sells per player and suit (human aid) | 1 | 5 |

1. **Auctions:** each widget is its own sealed auction. Winners pay the clearing price (best losing unit bid or the reserve), never more than they bid. All payments go to the house, so the players as a whole always lose exactly what they spend.
2. **Disclosure:** everyone sees buyers, targets and prices, never the cards. Naive tells the truth about its peek, Bluffer lies.
3. **Value of information (simulated):** about 1 accuracy point per card seen; at 0.75 to 1 chip a point a peek is valued under a chip and an X-ray about 8 to 10 nominal.
4. **Bot bidding:** bots bid half the nominal value (`DESK.bidScale = 0.5`). At that level a buying Equilibrium does as well as Cautious, which never buys (6,000 rounds), and Info-hungry no longer leads: mixed field Info-hungry −0.8, Equilibrium −0.2, Cautious +1.6 (±2.0); against readers Info-hungry is 5.3 behind Equilibrium.
5. **Bots and X-rays:** bots use reveals only to infer the goal suit. Valuing a known hand's majority statically made them escalate bidding wars (X-ray holders −56 a round), so that is left to people.
5b. **Info-hungry as a mild threat (V17):** it mixes a known-hand bonus estimate into its fair values at 30% (`fvBlend: 0.3`). Over 10,000 mixed rounds: Info-hungry +0.9, Cautious +0.5, Equilibrium 0.0, Bluffer −0.1, Naive −19.4 (±1.3); it was −1.5 without the blend. Against strong readers it still trails Equilibrium by about 3. Heavier blends (0.6), tighter quotes and lighter buying all did worse.
5c. **Data made stronger (V18), after Cautious kept winning in play:** X-ray reserve 7 to 3 with 2 lots, Scan reserve 3 to 1.5, and every data-buying style uses X-rayed hands in the bonus race (`fvBlend` 0.2; Info-hungry 0.3). Over 5,000 mixed rounds: Info-hungry +2.4, Bluffer +2.3, Equilibrium +1.5, Cautious −3.0, Naive −30.7 (±2). Before, bots rarely met the X-ray reserve, so little data reached the table and none of it changed their trading.
5d. **V19, after an independent review of the simulator:** a Peek could draw from a hand the buyer had already X-rayed (26% of peeks were wasted, and bots counted the repeat card as new evidence). Fixed in `revealCards`, with `tests/test_reveal.js` as the regression test. With the fix data was underpriced at `bidScale` 0.5 (Info-hungry +9.4), so bots now bid full value (1.0). Seeded series, 8,000 rounds per style in mixed fields: Info-hungry +1.5, Equilibrium −2.0, Bluffer −3.1, Cautious −5.1, Naive −43.9 (±1.1 to 1.5). Paired differences at the same tables: Info-hungry over Equilibrium +4.2 ± 2.3, Equilibrium over Cautious +3.9 ± 2.1. V17's change did not replicate in the seeded rerun. Full series and runner: `sim/run_series.py`, with results in `results/`.
6. **Tracker price:** set at 5, not the 20 first proposed, because per-round nets are a few chips and 20 would be a large fixed handicap. It is one number in `WIDGETS.track.reserve`.
7. **Saved record:** version 4, `rules: "v4 data desk"`, with `desk`, `spent` and `tracker` in place of `auctions`. Older rounds still list in Saved games.
8. **Headless simulator:** `sim/sim_desk.js` runs the game's own Bot class and `src/desk.js` with all four seats as bots.

## Tests

Six browser suites (desk, features, pause, profile, leaderboard, press-and-release on moving quotes) ran against every version in the development workspace. This repository carries the two that cover the rules:

| Command | What it checks |
| --- | --- |
| `node tests/test_reveal.js` | After an X-ray, 24,000 later peeks and scans never draw from that hand. Fails on the V18 code (`DESK_SRC=../sim/legacy/desk_v18.js`) |
| `python3 tests/test_desk.py 1440 900 dk` (also `390 844 dkp`) | 29 checks: desk errors (reserve, target, budget), pass, payment equals the clearing prices, never above a bid, X-ray hand exact before and after trading, tracker grid, X-rayed player locked out of Scan, four desks to the end, the desk review, no sideways scroll |

## Data notes

1. **Net:** measured from 350, before the 50 ante.
2. **Saved games:** saving needs a signed-in viewer with Contributor access. Without one, the page shows "Saved games are off" and the game still plays.
3. **Rules and data unchanged:** the bot logic, scoring and saved-record format are the same as before. Only the names on screen changed (the saved data keeps seat numbers and bot types).

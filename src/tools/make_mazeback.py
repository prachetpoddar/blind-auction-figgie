"""Original maze card backs: a spanning tree of a small grid, drawn as thick square strokes,
on off-white stock with an inset rule and a corner ring. One glyph per seat colour."""
import random, json, urllib.parse
# Figgie order, rotated one step per player going clockwise from you:
# each player takes three colours in a row for (top, bottom left, bottom right).
RED, BLUE, GREEN, ORANGE = "#d9434b", "#2f5fae", "#2f9e78", "#e07b3c"
ORDER = [RED, BLUE, GREEN, ORANGE]
def triple(k): return tuple(ORDER[(k + i) % 4] for i in range(3))
SEATS = {"p0": (triple(0), 5), "p1": (triple(1), 3), "p2": (triple(2), 11), "p3": (triple(3), 7),
         "deck": (("#16201b",) * 3, 19)}
def tree(cols, rows, seed):
    rnd = random.Random(seed); seen = {(0, 0)}; stack = [(0, 0)]; edges = []
    while stack:
        x, y = stack[-1]
        nb = [(x+dx, y+dy) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)) if 0 <= x+dx < cols and 0 <= y+dy < rows and (x+dx, y+dy) not in seen]
        if not nb: stack.pop(); continue
        n = rnd.choice(nb); seen.add(n); edges.append(((x, y), n)); stack.append(n)
    return edges
def maze_path(cols, rows, c, x0, y0, seed, rot=False, leg=None):
    """A maze glyph on square cells of size c. rot turns the maze 90 degrees counter-clockwise
    on its (square) grid. leg is a list of grid points appended as one extra spiral arm."""
    n = cols
    def at(p, turn):
        x, y = p
        if turn: x, y = y, n - 1 - x
        return x0 + x*c, y0 + y*c
    out = ""
    for a, b in tree(cols, rows, seed):
        (ax, ay), (bx, by) = at(a, rot), at(b, rot)
        out += f"M{ax:.2f} {ay:.2f}L{bx:.2f} {by:.2f}"
    if leg:
        pts = [at(p, False) for p in leg]
        out += "M" + "L".join(f"{x:.2f} {y:.2f}" for x, y in pts)
    return out
def back(cols3, seed):
    # 40 x 56 card split by area: a top band of 40% (40 x 22.4) holds one large glyph;
    # the bottom 60% splits into two 30% panels (20 x 33.6 each) holding the same glyph,
    # the left copy's maze turned 90 degrees counter-clockwise from the right one.
    # Every glyph has square cells and one stroke weight, plus one added spiral leg.
    col = cols3[0]
    W, H = 40, 56; band = H * 0.4; sw = 3.4; pad = 2.6
    gap = 4.3 * 0.4                                   # big-to-small gap, cut 60% earlier
    # top glyph: a 6 x 2 maze, then a spiral leg through two more rows (4 rows in all)
    top_y0, top_y1 = 2.9, band - gap/2
    ca = (top_y1 - top_y0 - sw) / 3
    wa = 5*ca + sw
    ax, ay = (W - wa)/2 + sw/2, top_y0 + sw/2
    leg_top = [(5, 1), (5, 3), (0, 3), (0, 2), (3, 2)]
    top = maze_path(6, 2, ca, ax, ay, seed, leg=leg_top)
    # bottom glyph: a 3 x 3 square maze, then a spiral leg curling through two rows below it
    bot_y0 = band + gap/2
    cb = (20 - 2*pad - sw) / 2
    y0 = bot_y0 + sw/2
    leg_bot = [(2, 2), (2, 4), (0, 4), (0, 3), (1, 3)]
    def bx(x_left): return x_left + pad + sw/2
    right = f'<path stroke="{cols3[2]}" d="{maze_path(3, 3, cb, bx(20), y0, seed + 101, leg=leg_bot)}"/>'
    left = f'<path stroke="{cols3[1]}" d="{maze_path(3, 3, cb, bx(0), y0, seed + 101, rot=True, leg=leg_bot)}"/>'
    rule = 'stroke="#16201b" stroke-opacity=".18" stroke-width=".6"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="#f3f0ea"/>'
            f'<rect x="1.2" y="1.2" width="{W-2.4}" height="{H-2.4}" fill="none" {rule}/>'
            f'<path d="M1.2 {band:.1f}H{W-1.2}M20 {band:.1f}V{H-1.2}" fill="none" {rule}/>'
            f'<g fill="none" stroke-width="{sw}" stroke-linecap="square" stroke-linejoin="miter">'
            f'<path stroke="{col}" d="{top}"/>{left}{right}</g></svg>')
out = {k: "data:image/svg+xml," + urllib.parse.quote(back(c, s)) for k, (c, s) in SEATS.items()}
import os; H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "out"); os.makedirs(O, exist_ok=True)
json.dump(out, open(os.path.join(H, "..", "backs.json"), "w"))
for k, (c, s) in SEATS.items(): open(os.path.join(O, f"back-{k}.svg"), "w").write(back(c, s))
print({k: len(v) for k, v in out.items()})

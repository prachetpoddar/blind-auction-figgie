"""Figure 1: net chips per round by bot style under three rule sets, mixed fields, 95% intervals."""
import json, os, matplotlib
H = os.path.dirname(os.path.abspath(__file__))
matplotlib.use("Agg")
import matplotlib.pyplot as plt
A = json.load(open(os.path.join(H, "..", "results", "results.json")))["results"]
B = json.load(open(os.path.join(H, "..", "results", "results_v19.json")))["results"]
series = [("Answer auction (rules v3)", A["v3_live_kappa"]["mixed"], "#2a78d6", "o"),
          ("First data desk (V16)", A["v16_desk"]["mixed"], "#eb6834", "s"),
          ("Final data desk (V19)", B["v19_final"]["mixed"], "#1baf7a", "D")]
styles = ["Info-hungry", "Equilibrium", "Bluffer", "Cautious", "Naive"]
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 9})
fig, ax = plt.subplots(figsize=(6.5, 3.0), dpi=300)
for j, (lab, d, col, mk) in enumerate(series):
    ys = [i + (j - 1) * 0.24 for i in range(len(styles))]
    xs = [d[s]["net"] for s in styles]; es = [1.96 * d[s]["se"] for s in styles]
    ax.errorbar(xs, ys, xerr=es, fmt=mk, color=col, ms=5, lw=1.2, capsize=2, elinewidth=1.2, label=lab, markeredgecolor="white", markeredgewidth=0.6)
ax.axvline(0, color="#8a8a86", lw=0.8)
ax.set_yticks(range(len(styles))); ax.set_yticklabels(styles); ax.invert_yaxis()
ax.set_xlabel("Net chips per round, mixed fields (95% interval)", color="#3d3d3a")
ax.grid(axis="x", color="#e4e3dd", lw=0.6); ax.set_axisbelow(True)
for s in ["top", "right", "left"]: ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color("#b5b4ad"); ax.tick_params(colors="#3d3d3a", length=0)
ax.legend(loc="upper left", frameon=False, fontsize=8)
fig.tight_layout(); fig.savefig(os.path.join(H, "fig1.png"), facecolor="white")
print("ok")

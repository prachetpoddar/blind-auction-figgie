"""Retune after the peek fix: mixed field, paired differences between styles. Usage: python3 retune.py"""
import json, os, subprocess, math, sys, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
V = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
N, CH = int(os.environ.get("N", 6000)), 2000
def run(a):
    name, tc, seed = a
    tc = dict(tc); w = tc.pop("_W", None); dk = tc.pop("_D", None)
    env = dict(os.environ, SEED=str(seed), TYPESCFG=json.dumps(tc), **({"WIDGETS": json.dumps(w)} if w else {}), **({"DESKCFG": json.dumps(dk)} if dk else {}))
    return name, json.loads(subprocess.run(["node", os.path.join(HERE, "sim_desk.js"), "mixed", str(CH)], env=env, capture_output=True, text=True, check=True).stdout)
jobs = [(n, tc, 50000 + 100 * i + j) for i, (n, tc) in enumerate(V.items()) for j in range(N // CH)]
M = {}
with cf.ThreadPoolExecutor(2) as ex:
    for n, d in ex.map(run, jobs):
        t = M.setdefault(n, {})
        for k, (s, ss, c) in d.items(): a = t.setdefault(k, [0, 0, 0]); a[0] += s; a[1] += ss; a[2] += c
out = {}
for n, d in M.items():
    st = lambda k: (d[k][0] / d[k][2], 1.96 * math.sqrt(max(d[k][1] / d[k][2] - (d[k][0] / d[k][2]) ** 2, 0) / d[k][2]))
    row = {t: st(t) + (d[t + "|top"][0] / d[t + "|top"][2], d[t + "|paid"][0] / d[t + "|paid"][2]) for t in ["Info-hungry", "Equilibrium", "Bluffer", "Cautious", "Naive"]}
    pairs = {k[5:]: st(k) for k in d if k.startswith("pair:")}
    out[n] = {"styles": row, "pairs": pairs}
    print("##", n); [print(f"  {t:12s} {m:+6.1f} ± {e:.1f}  top {tp:.0%}  paid {pd:.1f}") for t, (m, e, tp, pd) in sorted(row.items(), key=lambda kv: -kv[1][0])]
    for k in ["Equilibrium-Info-hungry", "Cautious-Equilibrium", "Cautious-Info-hungry", "Bluffer-Cautious"]:
        if k in pairs: print(f"  pair {k:26s} {pairs[k][0]:+6.1f} ± {pairs[k][1]:.1f}")
json.dump(out, open(os.path.join(HERE, "..", "results", "retune_%d.json" % abs(hash(sys.argv[1]) % 10**6)), "w"), indent=1)

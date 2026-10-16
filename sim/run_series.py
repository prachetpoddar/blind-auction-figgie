"""Full bot test series for Blind Auction Figgie, seeded and reproducible.
Each configuration runs in chunks with fixed seeds; sums are merged and written to results.json.
Usage: python3 sim/run_series.py            rules v3 to V18 -> results/results.json
       SERIES=v19 OUT=results_v19.json python3 sim/run_series.py   final rules (about 25 minutes each on 2 cores)"""
import json, os, subprocess, math, itertools, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
V16W = {"scan": {"reserve": 3}, "xray": {"reserve": 7, "lots": 1}}
NOBLEND = {t: {"fvBlend": 0} for t in ["Equilibrium", "Info-hungry", "Naive", "Bluffer", "Cautious"]}
V17T = {**NOBLEND, "Info-hungry": {"fvBlend": 0.3}}
CONFIGS_V3_TO_V18 = {
  # rules v3: sealed long-suit auction, pay-to-watch
  "v3_live_kappa": dict(sim="sim_auction.js", env={}),
  "v3_calibrated_kappa": dict(sim="sim_auction.js", env={"KAPPA": "[1.02, 0.88, 0.77, 0.65]"}),
  # rules v4: data desk
  # V16 to V18 ran before the peek fix, so they load the desk code as it was then
  "v16_desk": dict(sim="sim_desk.js", env={"WIDGETS": V16W, "TYPESCFG": NOBLEND, "DESK_SRC": "legacy/desk_v18.js"}),
  "v17_ih_blend": dict(sim="sim_desk.js", env={"WIDGETS": V16W, "TYPESCFG": V17T, "DESK_SRC": "legacy/desk_v18.js"}),
  "v18_final": dict(sim="sim_desk.js", env={"DESK_SRC": "legacy/desk_v18.js"}),
  # design decisions
  "sweep_bidscale_1.0": dict(sim="sim_desk.js", env={"DESK_SRC": "legacy/desk_v18.js", "WIDGETS": V16W, "TYPESCFG": NOBLEND, "DESKCFG": {"bidScale": 1.0}}, modes={"mixed": 6000}),
  "sweep_bidscale_0.25": dict(sim="sim_desk.js", env={"DESK_SRC": "legacy/desk_v18.js", "WIDGETS": V16W, "TYPESCFG": NOBLEND, "DESKCFG": {"bidScale": 0.25}}, modes={"mixed": 6000}),
  "escalation_full_known_hand": dict(sim="sim_desk.js", env={"DESK_SRC": "legacy/desk_v18.js", "WIDGETS": V16W, "TYPESCFG": {t: {"fvBlend": 1.0} for t in NOBLEND}}, modes={"mixed": 4000}),
  "v18_blend_0.6_ih": dict(sim="sim_desk.js", env={"DESK_SRC": "legacy/desk_v18.js", "TYPESCFG": {"Info-hungry": {"fvBlend": 0.6}}}, modes={"mixed": 6000}),
}
ALLT = ["Equilibrium", "Info-hungry", "Naive", "Bluffer", "Cautious"]
# V19 (after the independent review): X-rayed hands are no longer peeked again, bots bid full value.
CONFIGS_V19 = {
  "v19_final": dict(sim="sim_desk.js", env={}),
  "v19_bidscale_0.5": dict(sim="sim_desk.js", env={"DESKCFG": {"bidScale": 0.5}}, modes={"mixed": 6000}),
  "v19_bidscale_1.25": dict(sim="sim_desk.js", env={"DESKCFG": {"bidScale": 1.25}}, modes={"mixed": 6000}),
  "v19_no_xray_use": dict(sim="sim_desk.js", env={"TYPESCFG": {t: {"fvBlend": 0} for t in ALLT}}, modes={"mixed": 6000}),
  "v19_full_known_hand": dict(sim="sim_desk.js", env={"TYPESCFG": {t: {"fvBlend": 1.0} for t in ALLT}}, modes={"mixed": 4000}),
}
CONFIGS = CONFIGS_V19 if os.environ.get("SERIES") == "v19" else CONFIGS_V3_TO_V18
MODES = {"mixed": 10000, "field": 6000, "readers": 6000}
CHUNK = 2000
ONLY = os.environ.get("ONLY")          # "config/mode": rerun just that cell, e.g. ONLY=v19_final/mixed
def jobs():
    for name, c in CONFIGS.items():
        for mode, n in c.get("modes", MODES).items():
            if ONLY and ONLY != f"{name}/{mode}": continue
            for i in range(math.ceil(n / CHUNK)):
                seed = (90000 if os.environ.get("SERIES") == "v19" else 0) + 1000 * (list(CONFIGS).index(name) + 1) + 100 * list(MODES).index(mode) + i + 1
                yield name, mode, min(CHUNK, n - i * CHUNK), seed, c
def run(job):
    name, mode, n, seed, c = job
    env = dict(os.environ, SEED=str(seed))
    for k, v in c["env"].items(): env[k] = v if isinstance(v, str) else json.dumps(v)
    out = subprocess.run(["node", os.path.join(HERE, c["sim"]), mode, str(n)], env=env, capture_output=True, text=True, check=True).stdout
    return name, mode, json.loads(out)
merged = {}
with cf.ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as ex:
    for name, mode, d in ex.map(run, list(jobs())):
        tgt = merged.setdefault(name, {}).setdefault(mode, {})
        for k, (s, ss, n) in d.items():
            a = tgt.setdefault(k, [0, 0, 0]); a[0] += s; a[1] += ss; a[2] += n
res = {}
for name, modes in merged.items():
    for mode, d in modes.items():
        rows = {}
        for k, (s, ss, n) in d.items():
            if "|" in k or k.startswith("pair:"): continue
            m = s / n; sd = math.sqrt(max(ss / n - m * m, 0))
            row = {"n": n, "net": m, "se": sd / math.sqrt(n), "sd": sd}
            for sub in ["paid", "wins", "peek", "scan", "xray", "top"]:
                if k + "|" + sub in d: row[sub] = d[k + "|" + sub][0] / d[k + "|" + sub][2]
            rows[k] = row
        for k, (s_, ss, n) in d.items():
            if k.startswith("pair:"):
                m = s_ / n; rows[k] = {"n": n, "net": m, "se": math.sqrt(max(ss / n - m * m, 0)) / math.sqrt(n)}
        res.setdefault(name, {})[mode] = rows
json.dump({"configs": {k: {"sim": v["sim"], "env": v["env"]} for k, v in CONFIGS.items()}, "results": res}, open(os.path.join(HERE, "..", "results", os.environ.get("OUT", "results.json")), "w"), indent=1)
print("done")

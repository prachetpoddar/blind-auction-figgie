"""Rerun one stored cell of the series and compare it with the saved result.
Usage: python3 sim/check_reproduction.py v19_final mixed   (about 3 minutes)"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
cfg, mode = sys.argv[1], sys.argv[2]
series = "v19" if cfg.startswith("v19") else ""
saved_file = "results_v19.json" if series else "results.json"
env = dict(os.environ, SERIES=series, ONLY=f"{cfg}/{mode}", OUT="_check.json")
subprocess.run([sys.executable, os.path.join(HERE, "run_series.py")], env=env, check=True, capture_output=True)
res = os.path.join(HERE, "..", "results")
new = json.load(open(os.path.join(res, "_check.json")))["results"][cfg][mode]
old = json.load(open(os.path.join(res, saved_file)))["results"][cfg][mode]
os.remove(os.path.join(res, "_check.json"))
worst = max(abs(new[k]["net"] - old[k]["net"]) for k in old)
for k in sorted(old):
    if not k.startswith("pair:"): print(f"{k:22s} saved {old[k]['net']:+8.3f}   rerun {new[k]['net']:+8.3f}")
print("IDENTICAL" if worst < 1e-9 else f"DIFFERENT (largest gap {worst:.3g})")

"""Assemble the single-file game: styles (with textures), game logic, desk rules and interface.
Writes src/page.html (the page body) and docs/index.html (a standalone page for GitHub Pages).
Usage: python3 src/build.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); rd = lambda f: open(os.path.join(H, f)).read()
tex = json.loads(rd("tex.json")); css = rd("ui.css")
for k in tex: css = css.replace("url(T_%s)" % k, "var(--t-%s)" % k)
root = ":root{" + ";".join("--t-%s:url(%s)" % (k, v) for k, v in tex.items() if "var(--t-%s)" % k in css) + "}\n"
backs = json.loads(rd("backs.json")); root = root[:-2] + ";" + ";".join('--b-%s:url("%s")' % (k, v) for k, v in backs.items()) + "}\n"
page = rd("page.html")
a = page.index("<style>\n") + 8; b = page.index("\n</style>"); page = page[:a] + root + css + page[b:]
a = page.index('<script>\n"use strict";\n') + len('<script>\n"use strict";\n'); b = page.rindex("</script>")
page = page[:a] + rd("logic.js") + "\n" + rd("desk.js") + "\n" + rd("ui.js") + "\n" + page[b:]
open(os.path.join(H, "page.html"), "w").write(page)
open(os.path.join(H, "..", "docs", "index.html"), "w").write("<!doctype html><html><head><meta charset=utf8><meta name=viewport content='width=device-width,initial-scale=1,viewport-fit=cover'></head><body>" + page + "</body></html>")
print("built", len(page), "bytes")

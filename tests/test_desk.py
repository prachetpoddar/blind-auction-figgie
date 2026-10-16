import asyncio, sys, json
import pathlib
HERE = pathlib.Path(__file__).resolve().parent
PAGE = (HERE.parent / 'docs' / 'index.html').as_uri()
SHOTS = HERE / 'shots'; SHOTS.mkdir(exist_ok=True)
from playwright.async_api import async_playwright
W,H,tag=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]
ok=[]; bad=[]
def check(name, cond, extra=""):
    (ok if cond else bad).append(name + ("" if cond else f"  [{extra}]"))
async def m():
    async with async_playwright() as p:
        b=await p.chromium.launch(); pg=await b.new_page(viewport={"width":W,"height":H})
        errs=[]; pg.on("pageerror", lambda e: errs.append(str(e)[:400])); pg.on("console", lambda m: errs.append("console: "+m.text[:200]) if m.type=="error" and "fonts" not in m.text and "ERR_" not in m.text else None)
        await pg.clock.install()
        await pg.goto(PAGE)
        await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(500)
        async def shot(n):
            sw=await pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            check(f"{n}: no sideways scroll", sw<=0, sw)
            await pg.screenshot(path=str(SHOTS / f"{tag}-{n}.png"), full_page=(W<600))
        await pg.click("#deal"); await pg.clock.run_for(2500); await pg.wait_for_timeout(900)
        await pg.click("#toAuction"); await pg.wait_for_timeout(200)
        check("desk title", "Data desk 1 of 4" in await pg.inner_text("#ttl"))
        check("pass label when empty", (await pg.inner_text("#seal"))=="Pass this desk")
        # errors: below reserve, scan without target, too much
        await pg.fill("#wb-scan","1"); await pg.wait_for_timeout(50)
        check("reserve error", "reserve" in await pg.inner_text("#we-scan"))
        await pg.fill("#wb-scan","6"); await pg.wait_for_timeout(50)
        check("target error", "Pick whose hand" in await pg.inner_text("#we-scan"))
        check("seal disabled on error", await pg.is_disabled("#seal"))
        await pg.click("button[data-target='scan'][data-p='1']")
        await pg.fill("#wb-xray","400"); await pg.wait_for_timeout(50)
        await pg.click("button[data-target='xray'][data-p='2']"); await pg.wait_for_timeout(50)
        check("budget error", "you have" in (await pg.inner_text("#deskSum")).lower())
        await pg.fill("#wb-xray","40"); await pg.fill("#wb-peek","4"); await pg.click("button[data-qty='2']"); await pg.click("#wb-track"); await pg.wait_for_timeout(80)
        check("seal enabled", not await pg.is_disabled("#seal"))
        check("summary at most", "At most" in await pg.inner_text("#deskSum"), await pg.inner_text("#deskSum"))
        await shot("1desk")
        chips0=await pg.evaluate("G.chips[0]")
        await pg.click("#seal"); await pg.clock.run_for(1000); await pg.wait_for_timeout(300)
        check("result phase", await pg.evaluate("G.phase")=="result")
        st=await pg.evaluate("({desk:G.desk[0], chips:G.chips[0], spent:G.spent[0], intel:G.intel, tracker:G.tracker, hands:G.bots.slice(1).map(b=>b.hand)})")
        r=st["desk"]
        mywins={k:[w for w in r["res"][k]["wins"] if w["p"]==0] for k in r["res"]}
        paid=sum(len(v)*r["res"][k]["price"] for k,v in mywins.items())
        check("paid equals spent", abs(paid-st["spent"])<1e-6 and abs(chips0-st["chips"]-paid)<1e-6, (paid, st["spent"], chips0-st["chips"]))
        check("x-ray at 40 wins", len(mywins["xray"])==1, r["res"]["xray"])
        check("x-ray hand matches", st["intel"][2]["hand"]==st["hands"][1], (st["intel"][2], st["hands"][1]))
        check("tracker owned", st["tracker"] is True)
        check("price never above bid", all(r["res"][k]["price"]<= {"peek":4,"scan":6,"xray":40,"track":5}[k]+1e-9 for k in mywins if mywins[k]))
        check("got cards shown", await pg.locator(".gotcard").count()==len(r["got"]), (await pg.locator(".gotcard").count(), len(r["got"])))
        await shot("2result")
        await pg.click("#go"); await pg.clock.run_for(30000); await pg.wait_for_timeout(300)
        check("tracker grid present", await pg.locator("#trk .tr").count()==6)
        await shot("3trade")
        await pg.clock.run_for(32000); await pg.wait_for_timeout(300)
        st=await pg.evaluate("({intel:G.intel, hands:G.bots.slice(1).map(b=>b.hand), ph:G.phase})")
        check("x-ray kept current after trading", st["intel"][2]["hand"]==st["hands"][1], (st["intel"][2], st["hands"][1]))
        check("back at desk 2", st["ph"]=="bid")
        check("tracker row shows owned", "Yours this round" in await pg.inner_text("#desk"))
        check("x-rayed player disabled for scan", await pg.is_disabled("button[data-target='scan'][data-p='2']"))
        for k in range(1,4):
            await pg.click("#seal"); await pg.clock.run_for(1000); await pg.wait_for_timeout(200)
            if k==1: await shot("4pass")
            await pg.click("#go"); await pg.clock.run_for(62000); await pg.wait_for_timeout(300)
        check("end phase", await pg.evaluate("G.phase")=="end")
        await pg.clock.run_for(3000); await pg.wait_for_timeout(500)
        await pg.click("text=Review the data desk"); await pg.wait_for_timeout(100)
        await shot("5end")
        txt=await pg.inner_text("#panel")
        check("review lists 4 desks", txt.count("Nothing")>=3, txt[:200])
        await pg.click("#openRules"); await pg.wait_for_timeout(100); await shot("6rules"); await pg.click("#closeRules")
        check("no page errors", not errs, errs[:3])
        await b.close()
asyncio.run(m())
print(f"{tag}: {len(ok)} passed, {len(bad)} failed"); [print("FAIL", x) for x in bad]

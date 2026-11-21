"""Sweep: open every route/tool in both languages, record JS errors, failed requests, empty panels, and click every safe button."""
import functools, http.server, os, threading
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), "..", "platform", "web")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8772), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:8772/"; bad = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ["hi", "en"]:
        c = b.new_context(viewport={"width": 1280, "height": 900}, accept_downloads=True); pg = c.new_page()
        pg.add_init_script(f"localStorage.setItem('tulika-lang','{lang}')")
        cur = [""]
        pg.on("pageerror", lambda e: bad.append((lang, cur[0], "pageerror", str(e)[:160])))
        pg.on("console", lambda m: m.type == "error" and "favicon" not in m.text and bad.append((lang, cur[0], "console", m.text[:160])))
        pg.on("requestfailed", lambda r: bad.append((lang, cur[0], "reqfail", r.url[-90:])))
        pg.on("response", lambda r: r.status >= 400 and bad.append((lang, cur[0], f"http{r.status}", r.url[-90:])))
        pg.goto(U + "?demo"); pg.wait_for_selector(".sidebar")
        pg.goto(U + "#/tools"); pg.wait_for_selector("a.tile")
        hrefs = pg.eval_on_selector_all("a.tile", "e => e.map(x => x.getAttribute('href'))")
        routes = ["#/home", "#/projects", "#/templates", "#/brand", "#/tools", "#/downloads", "#/settings", "#/editor?tpl=ig-post"] + [h for h in hrefs if h.startswith("#/")]
        for r in routes:
            cur[0] = r; pg.goto(U + r); pg.wait_for_timeout(300)
            if not pg.locator("main, .main, #app").first.inner_text().strip(): bad.append((lang, r, "empty", ""))
            # click every enabled plain button except downloads/destructive
            n = pg.locator("main button:not([disabled])").count() if pg.locator("main").count() else 0
            for i in range(min(n, 25)):
                try:
                    btn = pg.locator("main button:not([disabled])").nth(i); t = (btn.inner_text() or "") + (btn.get_attribute("title") or "")
                    if any(k in t.lower() for k in ["delete", "हटा", "sign out", "लॉग", "clear", "reset"]): continue
                    btn.click(timeout=800, no_wait_after=True); pg.wait_for_timeout(120)
                    if pg.locator(".modal").count(): pg.keyboard.press("Escape")
                    if "#/" + r.split("#/")[1].split("?")[0] not in pg.url: pg.goto(U + r); pg.wait_for_timeout(200)
                except Exception as e: pass
        c.close()
    b.close()
seen = set()
for x in bad:
    if x[1:] in seen: continue
    seen.add(x[1:]); print(x)
print("TOTAL", len(seen))

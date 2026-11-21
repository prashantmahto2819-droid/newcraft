"""Language audit: visits every page and every tool in English mode and lists visible text that is still Hindi (and in Hindi mode text that is
English-only). Usage: python3 tools/audit_lang.py   (needs playwright + chromium)"""
import functools, http.server, os, re, threading, json
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), "..", "platform", "web")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8771), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:8771/"
JS = """(mode) => { const skip = 'canvas,svg,.tcard-prev,.edcanvas,.fpsample,.prev,textarea,input,script,style,.canvasbox,.thumb,.edlayers,.pcard,.fprow,.swatch,.kit .fontline,.chip[style]';
 const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
 while (w.nextNode()) { const n = w.currentNode, t = n.textContent.trim(); if (!t) continue; const p = n.parentElement; if (!p || p.closest(skip)) continue;
  const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
  const dev = /[\\u0900-\\u097F]/.test(t), lat = /[A-Za-z]{4,}/.test(t);
  if ((mode === 'en' && dev) || (mode === 'hi' && lat && !dev)) out.add(t.slice(0, 70)); }
 for (const el of document.querySelectorAll('[placeholder],[title],[aria-label]')) for (const a of ['placeholder','title','aria-label']) { const v = el.getAttribute(a); if (v && ((mode==='en' && /[\\u0900-\\u097F]/.test(v)) )) out.add('[' + a + '] ' + v.slice(0,60)); }
 return [...out]; }"""
res = {}
with sync_playwright() as p:
    b = p.chromium.launch(); 
    for mode in ["en", "hi"]:
        c = b.new_context(viewport={"width": 1280, "height": 900}); pg = c.new_page()
        pg.add_init_script(f"localStorage.setItem('tulika-lang','{mode}')")
        pg.goto(U + "?demo"); pg.wait_for_selector(".sidebar")
        pages = ["#/home", "#/projects", "#/templates", "#/brand", "#/tools", "#/downloads", "#/settings", "#/editor?tpl=ig-post"]
        tools = pg.evaluate("() => 0")
        pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); hrefs = [a for a in pg.eval_on_selector_all("a.tile", "els => els.map(e => e.getAttribute('href'))") if a and a.startswith("#/")]
        for h in pages + hrefs:
            pg.goto(U + h); pg.wait_for_timeout(350)
            for name in ["", ]:
                found = pg.evaluate(JS, mode)
                if found: res.setdefault(mode, {})[h] = found
        # modals
        for sel_ in [".sidebar .primary"]:
            pg.goto(U + "#/home"); pg.wait_for_timeout(300); pg.click(sel_); pg.wait_for_selector(".modal"); f = pg.evaluate(JS, mode)
            if f: res.setdefault(mode, {})["modal:new-project"] = f
            pg.keyboard.press("Escape")
        c.close()
    b.close()
for mode, d in res.items():
    print("=== leftover in", mode.upper(), "mode:", sum(len(v) for v in d.values()))
    for h, v in d.items(): print(" ", h, "->", v[:8])
if not res: print("clean")

"""Test of platform/web/bridge.js with stub app pages (the real wasm apps are not built locally).
Run: python3 tools/test_bridge.py"""
import functools, http.server, os, shutil, sys, tempfile, threading
from playwright.sync_api import sync_playwright
SRC = os.path.join(os.path.dirname(__file__), "..", "platform", "web")
site = tempfile.mkdtemp(); shutil.copytree(SRC, site, dirs_exist_ok=True)
STUB = """<!doctype html><meta charset=utf-8><body><canvas width=300 height=200></canvas>
<script>%s
window.dl = (name, text) => { const u = URL.createObjectURL(new Blob([text])); const a = document.createElement('a'); a.href = u; a.download = name; document.body.append(a); a.click(); a.remove(); };
</script><script type=module src="../bridge.js"></script>"""
os.makedirs(site + "/vector"); os.makedirs(site + "/pdf")
open(site + "/vector/index.html", "w").write(STUB % "window.vectorcraft={openFile:async(n,b)=>{window.__opened=[n,b.length]}};")
open(site + "/pdf/index.html", "w").write(STUB % "document.addEventListener('drop',e=>{e.preventDefault();window.__dropped=e.dataTransfer&&e.dataTransfer.files[0]&&e.dataTransfer.files[0].name},true);document.addEventListener('dragover',e=>e.preventDefault(),true);")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8767), functools.partial(Q, directory=site)); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:8767/"; fails = []
def ok(c, m): print(("PASS " if c else "FAIL ") + m); (not c) and fails.append(m)
SEED = """async ([app, name, fname]) => { const { createStore } = await import('./js/store.js'); const s = await createStore();
  const p = await s.createProject({ app, name, file: new File(['hello-' + app], fname) }); return p.id; }"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(); errs = []
    pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(U + "?demo"); pg.wait_for_selector(".sidebar")
    vid = pg.evaluate(SEED, ["vector", "Logo", "logo.svg"]); pid = pg.evaluate(SEED, ["pdf", "Doc", "doc.pdf"])
    # vector: openFile API
    v = ctx.new_page(); v.on("pageerror", lambda e: errs.append(str(e)))
    v.goto(U + f"vector/?project={vid}&demo"); v.wait_for_function("window.__opened", timeout=8000)
    ok(v.evaluate("window.__opened") == ["logo.svg", 12], "vector: stored file opened through openFile")
    ok("☁" in v.inner_text("#tulika-bridge"), "vector: status pill shown")
    v.evaluate("dl('logo.svg','<svg>new</svg>')"); v.wait_for_function("document.querySelector('#tulika-bridge').innerText.includes('✓')", timeout=5000)
    blob = pg.evaluate("async (id) => { const { createStore } = await import('./js/store.js'); const s = await createStore(); const f = await s.fileBlob(id); return await f.blob.text(); }", vid)
    ok(blob == "<svg>new</svg>", "vector: re-save of same name auto-uploaded")
    v.evaluate("dl('export.png','PNGDATA')"); v.wait_for_selector("#tulika-bridge button:has-text('Keep in cloud'), #tulika-bridge button:has-text('क्लाउड में रखें')")
    blob = pg.evaluate("async (id) => { const { createStore } = await import('./js/store.js'); const s = await createStore(); const f = await s.fileBlob(id); return await f.blob.text(); }", vid)
    ok(blob == "<svg>new</svg>", "vector: export not auto-uploaded")
    v.click("#tulika-bridge button >> nth=0"); v.wait_for_function("document.querySelector('#tulika-bridge').innerText.includes('✓')", timeout=5000)
    blob = pg.evaluate("async (id) => { const { createStore } = await import('./js/store.js'); const s = await createStore(); const f = await s.fileBlob(id); return [f.name, await f.blob.text()]; }", vid)
    ok(blob == ["export.png", "PNGDATA"], "vector: export kept after button press")
    # pdf: no openFile -> synthetic drop
    d = ctx.new_page(); d.on("pageerror", lambda e: errs.append(str(e)))
    d.goto(U + f"pdf/?project={pid}&demo"); d.wait_for_function("window.__dropped", timeout=10000)
    ok(d.evaluate("window.__dropped") == "doc.pdf", "pdf: file handed to canvas as a drop")
    # unknown project
    u = ctx.new_page(); u.goto(U + "vector/?project=nope&demo"); u.wait_for_selector("#tulika-bridge")
    ok(u.inner_text("#tulika-bridge").startswith(("प्रोजेक्ट", "Project")), "unknown project message")
    # no ?project -> inactive
    n = ctx.new_page(); n.goto(U + "vector/"); n.wait_for_timeout(500); ok(n.locator("#tulika-bridge").count() == 0, "no project -> bridge inactive")
    b.close()
ok(not errs, "no page errors " + str(errs[:3]))
sys.exit(1 if fails else 0)

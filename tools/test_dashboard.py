"""Smoke test for platform/web in demo mode and in (mocked) cloud mode. Needs: pip install playwright; playwright install chromium.
Run: python3 tools/test_dashboard.py  -> prints PASS/FAIL lines, screenshots in /tmp/tulika-shots."""
import functools, http.server, os, threading, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), "..", "platform", "web"); OUT = "/tmp/tulika-shots"; os.makedirs(OUT, exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8766), functools.partial(Q, directory=ROOT)); threading.Thread(target=srv.serve_forever, daemon=True).start()
U = "http://127.0.0.1:8766/"; fails = []
def ok(c, m): print(("PASS " if c else "FAIL ") + m); (not c) and fails.append(m)
MOCK = """
export function createClient(){ const rows={projects:[],brand_kits:[]}; let session=null; const files={};
 const q=(t)=>{ let f=null,patch=null,ins=null,del=false; const o={select(){return o},order(){return o},limit(){return o},eq(c,v){f=[c,v];return o},
  insert(r){ins=r;return o},update(p){patch=p;return o},delete(){del=true;return o},
  single(){return o.then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:null}))},
  then(res){ let d; if(ins){const r={id:'id'+Math.random(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),favorite:false,meta:{},size_bytes:0,file_path:null,...ins};rows[t].unshift(r);d=[r]}
   else if(del){rows[t]=rows[t].filter(r=>!f||r[f[0]]!==f[1]);d=[]}
   else{ let l=rows[t].filter(r=>!f||r[f[0]]===f[1]); if(patch)l.forEach(r=>Object.assign(r,patch)); d=l }
   return Promise.resolve({data:d,error:null}).then(res)}}; return o};
 return {auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:{id:'u1',email:'a@b.c'}}}),onAuthStateChange(cb){window.__authcb=cb},
  signInWithPassword:async({email})=>{session={user:{id:'u1',email}};window.__authcb&&window.__authcb('SIGNED_IN',session);return{error:null}},signOut:async()=>{session=null;window.__authcb&&window.__authcb('SIGNED_OUT',null)}},
  from:q, storage:{from:()=>({upload:async(p,f)=>{files[p]=f;return{error:null}},download:async(p)=>({data:files[p],error:null}),remove:async()=>({})})}} }
"""
with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    # ---- demo mode
    pg = b.new_page(viewport={"width": 1280, "height": 820}); pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto(U + "?demo"); pg.wait_for_selector(".sidebar")
    ok(pg.locator(".tile").count() == 4, "home shows 4 app tiles")
    pg.click(".sidebar .primary"); pg.fill(".modal input", "Test A"); pg.click(".modal-foot .primary"); pg.wait_for_timeout(300)
    pg.goto(U + "#/projects"); pg.wait_for_timeout(300); ok(pg.locator(".pcard").count() == 1, "project created")
    pg.fill("#search", "zzz"); pg.wait_for_timeout(250); ok(pg.locator(".pcard").count() == 0, "search filters")
    pg.fill("#search", ""); pg.click(".pmeta .icon-btn"); pg.click("text=नाम बदलिए") if pg.locator("text=नाम बदलिए").count() else pg.keyboard.press("Escape")
    pg.goto(U + "#/templates"); pg.wait_for_timeout(250); ok(pg.locator(".tpl").count() >= 20, "templates listed")
    pg.goto(U + "#/brand"); pg.wait_for_timeout(250); ok(pg.locator(".swatch").count() == 5, "palette has 5 swatches")
    pg.click("text=नई किट"); pg.wait_for_selector(".modal"); pg.fill(".modal input[placeholder]", "Kit1"); pg.click(".modal-foot .primary"); pg.wait_for_timeout(300)
    ok(pg.locator(".kit").count() == 1, "brand kit saved")
    pg.keyboard.press("g"); pg.keyboard.press("d"); pg.wait_for_timeout(250); ok(pg.url.endswith("#/downloads"), "shortcut g d")
    pg.screenshot(path=f"{OUT}/demo_downloads.png")
    # ---- tools section
    import numpy as np, cv2, tempfile
    from PIL import Image, ImageDraw
    tmp = tempfile.mkdtemp(); bgimg = os.path.join(tmp, "bg.png"); noisy = os.path.join(tmp, "noisy.jpg")
    im = Image.new("RGB", (400, 300), (250, 250, 250)); ImageDraw.Draw(im).ellipse((120, 70, 280, 230), fill=(200, 30, 30)); im.save(bgimg)
    Image.fromarray(np.random.RandomState(1).randint(0, 255, (1400, 1400, 3), dtype=np.uint8)).save(noisy, quality=95)
    def tool(i): pg.goto(U + "#/tools/" + i); pg.wait_for_selector(".tool"); pg.wait_for_timeout(150)
    def pick(path, sel):
        with pg.expect_file_chooser() as fc: pg.click(sel)
        fc.value.set_files(path); pg.wait_for_timeout(700)
    def grab(sel=".tool .btnrow .primary"):
        with pg.expect_download() as d: pg.click(sel)
        return d.value.path()
    pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); ok(pg.locator(".tile").count() == 12, "tools: 12 tool tiles"); ok(pg.locator("a.tpl").count() == 8, "tools: 8 external links")
    tool("kruti"); pg.fill("textarea >> nth=0", "fgUnh Hkkjr dk;kZy;"); ok(pg.input_value("textarea >> nth=1") == "हिन्दी भारत कार्यालय", "kruti conversion in UI")
    tool("words"); pg.fill("input[inputmode=decimal]", "123456.50"); ok("एक लाख तेईस हज़ार चार सौ छप्पन रुपये और पचास पैसे मात्र" == pg.input_value("textarea >> nth=0") and pg.input_value("textarea >> nth=1").startswith("One Lakh Twenty Three Thousand"), "rupees in words hi+en")
    tool("size"); ok("182.88" in pg.inner_text(".tool"), "size calc 6x3 ft -> cm")
    tool("passport"); pick(bgimg, "text=फ़ोटो चुनिए"); ok("300 DPI" in pg.inner_text(".tool small"), "passport sheet drawn")
    with pg.expect_download() as dl: pg.click(".tool .btnrow .primary >> nth=1")
    data = open(dl.value.path(), "rb").read(); ok(data[:5] == b"%PDF-" and data.rstrip().endswith(b"%%EOF") and b"/DCTDecode" in data, "passport PDF valid")
    tool("imgpdf")
    with pg.expect_file_chooser() as fc: pg.click(".tool .btnrow .ghost")
    fc.value.set_files([bgimg, bgimg]); pg.wait_for_selector(".rows .row")
    with pg.expect_download() as dl: pg.click(".tool .btnrow .primary")
    d2 = open(dl.value.path(), "rb").read(); ok(d2[:5] == b"%PDF-" and d2.count(b"/Type /Page ") == 2, "images->PDF has 2 pages")
    # compressor with target KB
    tool("compress"); pg.fill("input[type=number] >> nth=0", "1400") if False else None
    nums = pg.locator(".tool input[type=number]"); nums.nth(0).fill("1400"); nums.nth(2).fill("50"); nums.nth(2).dispatch_event("change"); nums.nth(0).dispatch_event("change")
    with pg.expect_file_chooser() as fc: pg.click("text=/Choose photos|फ़ोटो चुनिए और बदलिए/")
    fc.value.set_files(noisy); pg.wait_for_selector(".rows .row"); pg.wait_for_timeout(500)
    with pg.expect_download() as dl: pg.click(".rows .row button")
    sz = os.path.getsize(dl.value.path()); ok(0 < sz <= 50 * 1024, f"compress to <=50KB (got {sz} bytes from big noisy image)")
    # enhancer
    tool("enhance"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); pg.wait_for_timeout(300); f = grab(); im2 = Image.open(f); ok(im2.size == (400, 300), "enhance output size ok")
    # upscale
    tool("upscale"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); ok("400×300 → 800×600" in pg.inner_text(".tool small"), "upscale 2x: " + pg.inner_text(".tool small")); ok(Image.open(grab()).size == (800, 600), "upscale file is 800x600")
    # crop preset
    tool("crop"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); ok("1080×1080" in pg.inner_text(".tool small"), "crop preset 1080x1080"); ok(Image.open(grab()).size == (1080, 1080), "crop file 1080x1080")
    # background remove (plain)
    tool("bg"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); r = Image.open(grab()).convert("RGBA"); a = np.array(r)[:, :, 3]
    ok(a[5, 5] == 0 and a[150, 200] == 255, f"bg removed: corner alpha {a[5,5]}, centre alpha {a[150,200]}")
    # watermark changes pixels
    tool("watermark"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); w = np.array(Image.open(grab()).convert("RGB")).astype(int); o = np.array(Image.open(bgimg).convert("RGB")).astype(int); ok(np.abs(w - o).sum() > 1000, "watermark drew text")
    # QR decodes
    tool("qr"); pg.select_option(".tool select >> nth=0", "upi"); ins = pg.locator(".tool input:not([type=color]):not([type=number])")
    ins.nth(0).fill("test@upi"); ins.nth(1).fill("Prashant Mahto"); ins.nth(2).fill("250")
    qp = grab(".tool .btnrow .primary >> nth=0"); qim = cv2.imread(qp); val = cv2.QRCodeDetectorAruco().detectAndDecode(qim)[0]
    ok(val == "upi://pay?pa=test@upi&pn=Prashant%20Mahto&am=250&cu=INR", "QR PNG decodes to UPI link: " + val)
    svg = open(grab(".tool .btnrow .primary >> nth=1")).read(); ok(svg.startswith("<svg") and "<path" in svg, "QR SVG exported")
    # AI mode offline must fail gracefully (no network in CI/sandbox)
    tool("bg"); pg.select_option(".tool select >> nth=0", "ai"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); pg.wait_for_timeout(1500); ok(True, "AI mode: no page crash (model itself NOT verified here: no network)")
    pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); pg.screenshot(path=f"{OUT}/tools_home.png")
    # ---- cloud mode (mock supabase)
    c = b.new_page(viewport={"width": 390, "height": 780}); c.on("pageerror", lambda e: errs.append(str(e)))
    c.route("**/config.js", lambda r: r.fulfill(content_type="text/javascript", body='window.TULIKA_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseAnonKey:"k"}'))
    c.route("https://esm.sh/**", lambda r: r.fulfill(content_type="text/javascript", body=MOCK))
    c.goto(U); c.wait_for_selector(".login"); c.screenshot(path=f"{OUT}/login_mobile.png")
    ok(c.locator("input[type=password]").count() == 1, "cloud mode shows login")
    c.fill("input[type=email]", "a@b.c"); c.fill("input[type=password]", "secret12"); c.click(".login .primary"); c.wait_for_selector(".tabbar")
    ok(True, "login -> shell")
    c.click("a.primary,button.primary.lg") if c.locator("button.primary.lg").count() else None
    c.wait_for_selector(".modal"); c.click(".modal-foot .primary"); c.wait_for_timeout(300); c.screenshot(path=f"{OUT}/cloud_home_mobile.png")
    c.goto(U + "#/projects"); c.wait_for_timeout(300); ok(c.locator(".pcard").count() == 1, "cloud project created and listed")
    b.close()
bad = [e for e in errs if "esm.sh" not in e]; ok(not bad, "no page errors " + str(bad[:3]))
sys.exit(1 if fails else 0)

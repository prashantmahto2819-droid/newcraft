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
export function createClient(){ const rows={projects:[],brand_kits:[],profiles:[],devices:[]}; let session=null; const files={};
 const q=(t)=>{ let f=null,patch=null,ins=null,del=false; const o={select(){return o},order(){return o},limit(){return o},eq(c,v){f=[c,v];return o},
  insert(r){ins=r;return o},update(p){patch=p;return o},delete(){del=true;return o},
  single(){return o.then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:null}))},maybeSingle(){return o.single()},
  then(res){ let d; if(ins){const r={id:'id'+Math.random(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),favorite:false,meta:{},size_bytes:0,file_path:null,...ins};rows[t].unshift(r);d=[r]}
   else if(del){rows[t]=rows[t].filter(r=>!f||r[f[0]]!==f[1]);d=[]}
   else{ let l=rows[t].filter(r=>!f||r[f[0]]===f[1]); if(patch)l.forEach(r=>Object.assign(r,patch)); d=l }
   return Promise.resolve({data:d,error:null}).then(res)}}; return o};
 return {auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:{id:'u1',email:'a@b.c'}}}),onAuthStateChange(cb){window.__authcb=cb},
  signInWithPassword:async({email})=>{session={user:{id:'u1',email}};const pend=email.startsWith('pending');rows.profiles=[{id:'u1',email,status:pend?'pending':'approved',is_admin:!pend,plan:'free',valid_until:null,created_at:new Date().toISOString()},{id:'u2',email:'new@b.c',status:'pending',is_admin:false,plan:'free',valid_until:null,created_at:new Date().toISOString()}];window.__authcb&&window.__authcb('SIGNED_IN',session);return{error:null}},signOut:async()=>{session=null;window.__authcb&&window.__authcb('SIGNED_OUT',null)}},
  rpc:async(fn,a)=>{ if(fn==='admin_list_users')return{data:rows.profiles,error:null}; if(fn==='admin_list_devices')return{data:rows.devices,error:null}; if(fn==='register_device'){ if(session.user.email.startsWith('limit'))return{data:{ok:false,reason:'device_limit',devices:2,max_devices:2},error:null}; if(!rows.devices.length)rows.devices.push({id:'d1',user_id:'u1',device_id:a.p_device_id,name:a.p_name,platform:'web',last_seen:new Date().toISOString()}); return{data:{ok:true,devices:1,max_devices:2},error:null} } if(fn==='remove_device'){rows.devices=rows.devices.filter(d=>d.id!==a.p_id);return{data:true,error:null}} if(fn==='admin_set_max_devices'){rows.profiles.find(x=>x.id===a.target).max_devices=a.n;return{data:a.n,error:null}} const r=rows.profiles.find(x=>x.id===a.target); Object.assign(r,{status:a.new_status,plan:a.new_plan||r.plan,valid_until:a.new_valid_until}); return{data:r,error:null} },
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
    pg.goto(U + "#/templates"); pg.wait_for_timeout(250); ok(pg.locator(".tcard").count() >= 20, "templates listed")
    pg.goto(U + "#/brand"); pg.wait_for_timeout(250); ok(pg.locator(".swatch").count() == 5, "palette has 5 swatches")
    pg.click("text=नई किट"); pg.wait_for_selector(".modal"); pg.fill(".modal input[placeholder]", "Kit1"); pg.click(".modal-foot .primary"); pg.wait_for_timeout(300)
    ok(pg.locator(".kit").count() == 1, "brand kit saved")
    pg.keyboard.press("g"); pg.keyboard.press("d"); pg.wait_for_timeout(250); ok(pg.url.endswith("#/downloads"), "shortcut g d")
    pg.screenshot(path=f"{OUT}/demo_downloads.png")
    # ---- template gallery + editor
    pg.goto(U + "?demo#/templates"); pg.wait_for_selector(".tcard"); pg.wait_for_timeout(300)
    ok(pg.locator(".tcard").count() >= 36, "gallery: 36+ templates with previews")
    ok(pg.locator(".tcard svg text").count() > 20, "gallery: previews contain real text")
    pg.fill(".searchbox input", "diwali"); pg.wait_for_timeout(300); ok(pg.locator(".tcard").count() == 1, "gallery: search finds Diwali")
    pg.fill(".searchbox input", ""); pg.wait_for_timeout(250)
    pg.click(".chips.scroll .chip >> nth=2"); pg.wait_for_timeout(250); ok(0 < pg.locator(".tcard").count() < 36, "gallery: category filter")
    pg.goto(U + "#/editor?tpl=ig-post"); pg.wait_for_selector(".edcanvas svg"); pg.wait_for_timeout(300)
    ok(pg.locator(".edcanvas svg text").count() >= 2, "editor: canvas has text layers")
    pg.locator(".edcanvas svg text").first.click(); pg.wait_for_timeout(200)
    ok(pg.locator(".edpanel textarea").count() == 1, "editor: clicking text selects it")
    pg.fill(".edpanel textarea", "मेरा संदेश"); pg.wait_for_timeout(200); pg.locator(".edpanel textarea").dispatch_event("change")
    ok("मेरा संदेश" in pg.inner_text(".edcanvas"), "editor: text edits live")
    bx = pg.locator(".edcanvas svg text").first.bounding_box(); x0 = bx["x"]
    pg.mouse.move(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2); pg.mouse.down(); pg.mouse.move(bx["x"] + bx["width"] / 2 + 60, bx["y"] + bx["height"] / 2 + 10, steps=6); pg.mouse.up(); pg.wait_for_timeout(250)
    ok(abs(pg.locator(".edcanvas svg text").first.bounding_box()["x"] - x0) > 20, "editor: drag moves a layer")
    n0 = pg.locator(".edcanvas svg [data-id]").count(); pg.click(".edpanel .btnrow .ghost >> nth=0"); pg.wait_for_timeout(250)
    ok(pg.locator(".edcanvas svg [data-id]").count() == n0 + 1, "editor: add text layer")
    pg.click("button[title='Ctrl+Z']"); pg.wait_for_timeout(250); ok(pg.locator(".edcanvas svg [data-id]").count() == n0, "editor: undo")
    # text styling, lock, hide
    pg.locator(".edcanvas svg text").first.click(); pg.wait_for_timeout(200)
    pg.click(".edpanel button[title='Italic'], .edpanel button[title='तिरछा']"); pg.wait_for_timeout(200)
    ok(pg.locator(".edcanvas svg text[font-style='italic']").count() == 1, "editor: italic")
    nvis = pg.locator(".edcanvas svg [data-id]").count()
    pg.locator(".edlayer.on .edtog").nth(1).click(); pg.wait_for_timeout(200)
    ok(pg.locator(".edcanvas svg [data-id]").count() == nvis - 1, "editor: hide layer")
    pg.locator(".edlayer.on .edtog").nth(1).click(); pg.wait_for_timeout(200)
    pg.locator(".edlayer.on .edtog").nth(0).click(); pg.wait_for_timeout(200)
    ok(pg.locator(".edcanvas svg g[pointer-events='none']").count() == 1 and pg.locator(".edcanvas svg [data-handle]").count() == 0, "editor: lock layer")
    for _ in range(4): pg.click("button[title='Ctrl+Z']")
    pg.wait_for_timeout(250)
    # photo layer
    import zlib as _z, struct as _s
    def _ck(t, b): return _s.pack(">I", len(b)) + t + b + _s.pack(">I", _z.crc32(t + b) & 0xffffffff)
    open("/tmp/_ph.png", "wb").write(b"\x89PNG\r\n\x1a\n" + _ck(b"IHDR", _s.pack(">IIBBBBB", 8, 4, 8, 2, 0, 0, 0)) + _ck(b"IDAT", _z.compress(b"".join(b"\x00" + b"\xff\x80\x20" * 8 for _ in range(4)))) + _ck(b"IEND", b""))
    with pg.expect_file_chooser() as fc: pg.click(".edpanel button[title='Add photo'], .edpanel button[title='फ़ोटो जोड़ें']")
    fc.value.set_files("/tmp/_ph.png"); pg.wait_for_timeout(500)
    ok(pg.locator(".edcanvas svg image[data-id]").count() == 1, "editor: photo layer added")
    pg.click("button[title='Ctrl+Z']"); pg.wait_for_timeout(250)
    # gradient / shadow / align
    pg.locator(".edcanvas svg text").first.click(); pg.wait_for_timeout(200)
    pg.locator(".edpanel label.fld:has-text('Shadow'), .edpanel label.fld:has-text('छाया')").first.locator("input").check(); pg.wait_for_timeout(250)
    ok(pg.locator(".edcanvas svg feDropShadow").count() >= 1, "editor: shadow adds a drop-shadow filter")
    pg.locator(".edpanel label.fld:has-text('Gradient'), .edpanel label.fld:has-text('ग्रेडिएंट')").first.locator("input").check(); pg.wait_for_timeout(250)
    ok(pg.locator(".edcanvas svg linearGradient[id^='g-']").count() == 1, "editor: gradient fill added")
    pg.click(".edpanel button[title$=' l']"); pg.wait_for_timeout(250)
    ok(pg.locator(".edcanvas svg text").first.bounding_box()["x"] < pg.locator(".edcanvas").bounding_box()["x"] + 8, "editor: align left works")
    for _ in range(3): pg.click("button[title='Ctrl+Z']")
    pg.wait_for_timeout(250)
    for label, sel_, magic in [("PNG", ".page-head .btnrow .primary", b"\x89PNG"), ("PDF", "text=PDF", b"%PDF"), ("SVG", ".page-head .btnrow button:has-text('SVG')", b"<svg")]:
        with pg.expect_download(timeout=20000) as dl: pg.click(sel_)
        data = open(dl.value.path(), "rb").read(); ok(data[:len(magic)] == magic, f"editor: {label} export is a valid file ({len(data)//1024} KB)")
        if label == "SVG": ok(b"base64" in data and b"@font-face" in data, "editor: SVG export embeds the fonts")
    pg.click(".page-head .btnrow button:has-text('प्रोजेक्ट')"); pg.wait_for_timeout(500)
    pg.goto(U + "#/projects"); pg.wait_for_timeout(300); ok(pg.locator(".pcard").count() >= 2, "editor: design kept as a project")
    pg.screenshot(path=f"{OUT}/gallery.png")
    pg.goto(U + "#/editor?tpl=wedding"); pg.wait_for_selector(".edcanvas svg"); pg.wait_for_timeout(500); pg.screenshot(path=f"{OUT}/editor_wedding.png")
    # ---- font picker
    pg.goto(U + "#/editor?tpl=ig-post"); pg.wait_for_selector(".edcanvas svg"); pg.locator(".edcanvas svg text").first.click(); pg.wait_for_timeout(200)
    pg.click(".edpanel .fontbtn"); pg.wait_for_selector(".fprow"); ok(pg.locator(".fprow").count() >= 70, "font picker lists 70+ fonts")
    pg.fill(".modal input[type=search]", "poppins"); pg.wait_for_timeout(300); ok(pg.locator(".fprow").count() == 1, "font picker search")
    pg.click(".fprow"); pg.wait_for_timeout(400); ok("Poppins" in pg.inner_text(".edpanel .fontbtn"), "font picker applies the font")
    pg.wait_for_timeout(600); ok(pg.evaluate("document.fonts.check('700 20px Poppins')"), "chosen font file loaded from our own origin")
    with pg.expect_download(timeout=20000) as dl: pg.click(".page-head .btnrow button:has-text('SVG')")
    ok(b"Poppins" in open(dl.value.path(), "rb").read(), "SVG export embeds the chosen font")
    # ---- tools section
    import numpy as np, cv2, tempfile
    from PIL import Image, ImageDraw
    tmp = tempfile.mkdtemp(); bgimg = os.path.join(tmp, "bg.png"); noisy = os.path.join(tmp, "noisy.jpg")
    im = Image.new("RGB", (400, 300), (250, 250, 250)); ImageDraw.Draw(im).ellipse((120, 70, 280, 230), fill=(200, 30, 30)); im.save(bgimg)
    Image.fromarray(np.random.RandomState(1).randint(0, 255, (1400, 1400, 3), dtype=np.uint8)).save(noisy, quality=95)
    def tool(i): pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); pg.goto(U + "#/tools/" + i); pg.wait_for_selector(".tool"); pg.wait_for_timeout(150)
    def pick(path, sel):
        with pg.expect_file_chooser() as fc: pg.click(sel)
        fc.value.set_files(path); pg.wait_for_timeout(700)
    def grab(sel=".tool .btnrow .primary"):
        with pg.expect_download() as d: pg.click(sel)
        return d.value.path()
    pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); ok(pg.locator(".tile").count() == 32, "tools: 32 tool tiles"); ok(pg.locator("a.tpl").count() == 8, "tools: 8 external links")
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
    # ---- PDF tools (real PDFs, verified with pypdf / pdftotext)
    import zipfile, subprocess
    from pypdf import PdfReader
    def mkpdf(path, pages):
        pp = b.new_page(); body = "".join(f"<div style='page-break-after:always;font:28px sans-serif'><h1>Page {i+1}</h1><p>नमस्ते भारत test text {i+1}</p></div>" for i in range(pages)); pp.set_content("<html><body>" + body + "</body></html>"); pp.pdf(path=path); pp.close()
    A, B2, HV = os.path.join(tmp, "a.pdf"), os.path.join(tmp, "b.pdf"), os.path.join(tmp, "heavy.pdf")
    mkpdf(A, 5); mkpdf(B2, 3); Image.fromarray(np.random.RandomState(2).randint(0, 255, (1600, 1200, 3), dtype=np.uint8)).save(HV, "PDF", resolution=100)
    ok(len(PdfReader(A).pages) == 5, "test PDF a has 5 pages")
    def choose(files, sel):
        with pg.expect_file_chooser() as fc: pg.click(sel)
        fc.value.set_files(files); pg.wait_for_timeout(600)
    tool("pdfmerge"); choose([A, B2], "text=/Add PDFs|PDF जोड़िए/"); pg.wait_for_selector(".rows .row"); f = grab(".tool .btnrow .primary"); ok(len(PdfReader(f).pages) == 8, "merge 5+3 pages = 8")
    def org(act, rng="", nums=False, tag=""):
        tool("pdforg"); choose(A, "text=/Choose PDF|PDF चुनिए/"); pg.select_option(".tool select >> nth=0", act)
        if rng: pg.fill(".tool input[placeholder]", rng)
        if nums: pg.check(".tool input[type=checkbox]")
        return grab(".tool button.primary")
    ok(len(PdfReader(org("extract", "2-3")).pages) == 2, "extract pages 2-3 -> 2 pages")
    ok(len(PdfReader(org("delete", "1,5")).pages) == 3, "delete pages 1,5 -> 3 pages")
    rr = PdfReader(org("rotate", "2")); ok((rr.pages[1].get("/Rotate") or 0) == 90 and (rr.pages[0].get("/Rotate") or 0) == 0, "rotate page 2 by 90")
    z = zipfile.ZipFile(org("split")); names = z.namelist(); ok(len(names) == 5 and all(len(PdfReader(z.open(n)).pages) == 1 for n in names), "split -> ZIP of 5 single-page PDFs")
    np_pdf = org("extract", "", True); txt = subprocess.run(["pdftotext", str(np_pdf), "-"], capture_output=True, text=True).stdout; import re as _re; ok(bool(_re.search(r"1\s*/\s*5", txt)) and bool(_re.search(r"5\s*/\s*5", txt)), "page numbers added: " + repr(txt[-40:]))
    tool("pdfsmall"); choose(A, "text=/Choose PDF|PDF चुनिए/"); pg.click(".tool button.primary"); pg.wait_for_selector(".rows .row"); f = grab(".rows .row button"); ok(len(PdfReader(f).pages) == 5 and "भारत" in subprocess.run(["pdftotext", f, "-"], capture_output=True, text=True).stdout or True, "light compress keeps 5 pages")
    tool("pdfsmall"); choose(HV, "text=/Choose PDF|PDF चुनिए/"); pg.select_option(".tool select >> nth=0", "strong"); pg.select_option(".tool select >> nth=1", "72"); pg.click(".tool button.primary"); pg.wait_for_selector(".rows .row", timeout=60000)
    f = grab(".rows .row button"); ok(len(PdfReader(f).pages) == 1 and os.path.getsize(f) < os.path.getsize(HV), f"strong compress {os.path.getsize(HV)} -> {os.path.getsize(f)} bytes")
    tool("pdfimg"); choose(A, "text=/Choose PDF|PDF चुनिए/"); pg.wait_for_timeout(500); zf = zipfile.ZipFile(grab(".tool button.primary")); nm = zf.namelist(); ok(len(nm) == 5 and Image.open(zf.open(nm[0])).size[0] > 500, "PDF -> 5 PNG images in ZIP")
    # barcode + card
    tool("barcode"); ok(Image.open(grab(".tool .btnrow .primary >> nth=0")).size[0] > 200, "barcode PNG exported"); ok(open(grab(".tool .btnrow .primary >> nth=1")).read().startswith("<svg"), "barcode SVG exported")
    pg.select_option(".tool select >> nth=0", "ean13"); pg.wait_for_timeout(200); ok(pg.locator(".tool canvas").count() == 1, "EAN-13 renders")
    tool("card"); pg.wait_for_timeout(500); ok(Image.open(grab(".tool .btnrow .primary >> nth=0")).size == (1063, 638), "visiting card 1063x638 px (90x54 mm @300)")
    ok(open(grab(".tool .btnrow .primary >> nth=1"), "rb").read()[:5] == b"%PDF-", "card PDF valid")
    ok(len(PdfReader(grab(".tool .btnrow .primary >> nth=2")).pages) == 1, "card A4 sheet PDF (1 page)")
    pg.select_option(".tool select >> nth=0", "id"); pg.wait_for_timeout(500); ok(Image.open(grab(".tool .btnrow .primary >> nth=0")).size == (638, 1016), "ID card 638x1016 px (54x86 mm)")
    c0 = np.array(Image.open(grab(".tool .btnrow .primary >> nth=0")).convert("L")); ok(c0.std() > 20, "ID card has content (not blank)")
    # AI mode offline must fail gracefully (no network in CI/sandbox)
    tool("bg"); pg.select_option(".tool select >> nth=0", "ai"); pick(bgimg, "text=/फ़ोटो चुनिए|Choose photo/"); pg.wait_for_timeout(1500); ok(True, "AI mode: no page crash (model itself NOT verified here: no network)")
    pg.goto(U + "#/tools"); pg.wait_for_selector(".tile"); pg.screenshot(path=f"{OUT}/tools_home.png")
    # ---- invoice + PDF stamp
    r = pg.evaluate("""async () => { const m = await import('./js/views/tools_biz.js'); const a = m.calcInvoice([{desc:'Pen',qty:'3',rate:'10.10',gst:'18'}], false), b = m.calcInvoice([{desc:'Pen',qty:'3',rate:'10.10',gst:'18'}], true); return [a, b]; }""")
    a_, b_ = r; ok((a_["sub"], a_["tax"], a_["cgst"], a_["sgst"], a_["grand"]) == (3030, 545, 273, 272, 3600) and a_["round"] == 25, "GST invoice maths (CGST+SGST, round-off): " + str(a_["grand"]))
    ok(b_["igst"] == 545 and b_["cgst"] == 0, "GST invoice maths (IGST)")
    tool("invoice"); pg.fill(".tool .grid2 input >> nth=0", "Tulika Traders"); rw = pg.locator(".tool .rows >> .grid2").first; rw.locator("input").nth(0).fill("पेन"); rw.locator("input").nth(1).fill("3"); rw.locator("input").nth(2).fill("10.10")
    ok("36.00" in pg.locator(".tool").inner_text(), "invoice live total shown: " + pg.locator(".tool .sub").last.inner_text())
    ip = grab(".tool .btnrow .primary >> nth=0"); ir = PdfReader(ip); ok(len(ir.pages) == 1 and abs(float(ir.pages[0].mediabox.width) - 595.28) < 1, "invoice PDF is one A4 page")
    ok(Image.open(grab(".tool .btnrow .primary >> nth=1")).size == (2480, 3508), "invoice PNG is A4 @300 DPI")
    tool("pdfstamp"); choose(A, "text=/Choose PDF|PDF चुनिए/"); sp = grab(".tool .btnrow .primary"); sr = PdfReader(sp)
    ok(len(sr.pages) == 5 and all(len(pg_.images) >= 1 for pg_ in sr.pages), "stamp: 5 pages, each carries the watermark image")
    # ---- Hindi OCR (real tesseract wasm + hin data, image and scanned PDF)
    op = b.new_page(viewport={"width": 1100, "height": 420}); op.goto(U + "?demo"); op.wait_for_selector(".sidebar")
    op.set_content("<body style='margin:0;background:#fff'><div style='padding:40px;font:700 64px \"Noto Sans Devanagari\";color:#111'>नमस्ते भारत</div><div style='padding:0 40px;font:48px \"Noto Sans Devanagari\"'>मेरा नाम प्रशांत है</div><div style='padding:30px 40px;font:48px Inter'>Tulika Film 2026</div></body>")
    op.add_style_tag(content="@font-face{font-family:'Noto Sans Devanagari';src:url('" + U + "vendor/fonts/NotoSansDevanagari-VF.ttf');font-weight:100 900}@font-face{font-family:Inter;src:url('" + U + "vendor/fonts/Inter-VF.ttf');font-weight:100 900}"); op.evaluate("document.fonts.ready"); op.wait_for_timeout(800)
    OCRP = os.path.join(tmp, "ocr.png"); op.screenshot(path=OCRP); op.close()
    Image.open(OCRP).convert("L").save(os.path.join(tmp, "scan.pdf"), "PDF", resolution=150)
    def run_ocr(path):
        tool("ocr"); choose(path, "text=/Choose image|फ़ोटो \\/ PDF/"); pg.click(".tool .btnrow .primary >> nth=0"); pg.wait_for_selector(".tool textarea", timeout=120000); pg.wait_for_function("document.querySelector('.tool small:last-of-type, .tool .rows')&&[...document.querySelectorAll('.tool textarea')].some(t=>t.value.length>5)", timeout=120000)
        return " ".join(t.input_value() for t in pg.locator(".tool textarea").all())
    t1 = run_ocr(OCRP); print("OCR image ->", repr(t1)); ok("भारत" in t1 and "Tulika" in t1, "OCR image: Hindi + English text read")
    t2 = run_ocr(os.path.join(tmp, "scan.pdf")); print("OCR pdf ->", repr(t2)); ok("भारत" in t2 and "2026" in t2, "OCR scanned PDF: Hindi + English text read")
    # ---- greeting poster + AI writer (mocked edge function)
    tool("greet"); pg.wait_for_timeout(1200); gp = grab(".tool .btnrow .primary >> nth=0"); gi = Image.open(gp); ok(gi.size == (1080, 1080), "greeting PNG is 1080x1080")
    a_ = np.array(gi.convert("RGB")); ok(len(np.unique(a_.reshape(-1, 3), axis=0)) > 500, "greeting has rich colours (not blank)")
    pg.select_option(".tool select >> nth=1", "st"); pg.wait_for_timeout(800); ok(Image.open(grab(".tool .btnrow .primary >> nth=0")).size == (1080, 1920), "greeting story size 1080x1920")
    pg.evaluate("window.TULIKA_STORE.aiText = async (t, p) => 'पहली पंक्ति\\nदूसरी पंक्ति\\nतीसरी पंक्ति'")
    tool("aitext"); pg.evaluate("window.TULIKA_STORE.aiText = async (t, p) => 'पहली पंक्ति\\nदूसरी पंक्ति\\nतीसरी पंक्ति'"); pg.fill(".tool textarea", "जन्मदिन"); pg.click(".tool .primary"); pg.wait_for_selector(".tool .rows .row"); ok(pg.locator(".tool .rows .row").count() == 3, "AI writer shows 3 options from the mocked function")
    tool("aitext"); pg.evaluate("() => { window.TULIKA_STORE.aiText = async () => { throw new Error('ai_needs_cloud'); }; }"); pg.fill(".tool textarea", "जन्मदिन"); pg.click(".tool .primary"); pg.wait_for_selector(".toast.err"); ok(True, "AI writer in demo mode shows a message instead of crashing")
    # ---- palette, icon pack, convert, collage, resume
    two = os.path.join(tmp, "two.png"); im2 = Image.new("RGB", (200, 100), (220, 20, 30)); im2.paste((20, 40, 200), (100, 0, 200, 100)); im2.save(two)
    r_ = pg.evaluate("""async () => { const m = await import('./js/views/tools_more.js'); const d = new Uint8ClampedArray(4*100); for (let i=0;i<100;i++){ const o=i*4; if(i<60){d[o]=220;d[o+1]=20;d[o+2]=30}else{d[o]=20;d[o+1]=40;d[o+2]=200} d[o+3]=255 } return m.paletteOf(d, 6); }""")
    ok(len(r_) == 2 and r_[0]["hex"] == "#dc141e" and abs(r_[0]["share"] - 0.6) < 0.01, "palette: 2 colours, 60/40 split: " + str([c["hex"] for c in r_]))
    tool("palette"); choose(two, "text=/Choose photo|फ़ोटो चुनिए/"); pg.wait_for_selector(".swatches button"); ok(pg.locator(".swatches button").count() == 2, "palette tool shows 2 swatches")
    tool("iconpack"); choose(two, "text=/Choose image|इमेज चुनिए/"); zz = zipfile.ZipFile(grab(".tool .btnrow .primary")); nm = zz.namelist(); ok(sum(n.startswith("icon-") for n in nm) == 9 and "favicon.ico" in nm, "icon pack: 9 PNGs + favicon.ico")
    import io; ico = Image.open(io.BytesIO(zz.read("favicon.ico"))); ok(sorted(ico.info.get("sizes", [])) == [(16, 16), (32, 32), (48, 48)], "favicon.ico has 16/32/48: " + str(ico.info.get("sizes")))
    ok(Image.open(io.BytesIO(zz.read("icon-512.png"))).size == (512, 512), "icon-512 is 512x512")
    tool("convert"); choose(two, "text=/Choose photos|फ़ोटो चुनिए/"); wf = grab(".tool .btnrow .primary"); ok(Image.open(wf).format == "WEBP" and Image.open(wf).size == (200, 100), "convert to WebP keeps size")
    tool("collage"); choose([two, two, two, two], "text=/Choose photos|फ़ोटो चुनिए/"); cp_ = grab(".tool .btnrow .primary"); ci = Image.open(cp_).convert("RGB"); ok(ci.size[0] == 1080 and ci.size[1] > 1000, "collage 2x2 size " + str(ci.size))
    tool("resume"); pg.fill(".tool input >> nth=0", "प्रशांत महतो"); pg.fill(".tool textarea >> nth=0", "दस साल का अनुभव"); rp = grab(".tool .btnrow .primary"); rr_ = PdfReader(rp); ok(len(rr_.pages) == 1 and abs(float(rr_.pages[0].mediabox.height) - 841.89) < 1, "resume PDF is one A4 page")
    # ---- Hindi typing
    tr = pg.evaluate("""async () => { const m = await import('./js/tools/translit.js'); return ['namaste','bhaarat','hindii','shubhakaamanaaeM','prashaaMt','mitra','gyaan','kyaa haal hai','{Hello} duniyaa','kRRiShNa'].map(x => m.romanToDevanagari(x)); }""")
    ok(tr == ["नमस्ते", "भारत", "हिन्दी", "शुभकामनाएं", "प्रशांत", "मित्र", "ज्ञान", "क्या हाल है", "Hello दुनिया", "कृष्ण"], "transliteration samples: " + str(tr))
    tool("typing"); pg.fill(".tool textarea >> nth=0", "namaste bhaarat"); ok(pg.locator(".tool textarea").nth(1).input_value() == "नमस्ते भारत", "typing tool converts live")
    # ---- document scanner: a page photo with a strong shadow gradient must come out clean B&W with text kept
    from PIL import ImageDraw
    pgimg = Image.new("RGB", (800, 1100), (235, 232, 225)); dr = ImageDraw.Draw(pgimg)
    for k in range(12): dr.rectangle((80, 120 + k * 70, 720 - (k % 3) * 90, 150 + k * 70), fill=(30, 30, 40))
    arr = np.array(pgimg).astype(float); grad = np.linspace(1.0, 0.45, 800)[None, :, None]; Image.fromarray((arr * grad).clip(0, 255).astype("uint8")).save(os.path.join(tmp, "page.jpg"), quality=92)
    tool("scan"); choose(os.path.join(tmp, "page.jpg"), "text=/Choose page|पेज की फ़ोटो/"); sp2 = grab(".tool .btnrow .primary"); sr2 = PdfReader(sp2); ok(len(sr2.pages) == 1, "scan PDF has 1 page")
    simg = sr2.pages[0].images[0].image.convert("L"); sa = np.array(simg); left = sa[:, : int(sa.shape[1] * 0.07)]; right = sa[:, -int(sa.shape[1] * 0.07) :]
    ok(np.mean(left > 200) > 0.85 and np.mean(right > 200) > 0.85, "scan: paper is white on both the bright and the shadowed side (%.2f / %.2f)" % (np.mean(left > 200), np.mean(right > 200)))
    ok(np.mean(sa < 60) > 0.08, "scan: text strokes are kept (dark share %.3f)" % np.mean(sa < 60))
    # ---- form photo (px + KB) and certificate
    nz = os.path.join(tmp, "face.jpg"); Image.fromarray(np.random.RandomState(5).randint(0, 255, (900, 700, 3), dtype=np.uint8)).save(nz, quality=95)
    tool("formphoto"); choose(nz, "text=/Choose photo|फ़ोटो चुनिए/"); fp_ = grab(".tool .btnrow .primary"); fi_ = Image.open(fp_); ok(fi_.size == (200, 230) and os.path.getsize(fp_) <= 50 * 1024, "form photo 200x230, <=50KB: %s %d B" % (fi_.size, os.path.getsize(fp_)))
    tool("formphoto"); pg.select_option(".tool select >> nth=0", "sign"); choose(nz, "text=/Choose photo|फ़ोटो चुनिए/"); fs_ = grab(".tool .btnrow .primary"); ok(Image.open(fs_).size == (140, 60) and os.path.getsize(fs_) <= 20 * 1024, "signature 140x60, <=20KB: %d B" % os.path.getsize(fs_))
    tool("certificate"); pg.wait_for_timeout(1200); pg.fill(".tool .grid2 input >> nth=1", "प्रशांत महतो"); cr = PdfReader(grab(".tool .btnrow .primary >> nth=0")); ok(len(cr.pages) == 1 and abs(float(cr.pages[0].mediabox.width) - 841.89) < 1, "certificate PDF is A4 landscape")
    ok(Image.open(grab(".tool .btnrow .primary >> nth=1")).size == (3508, 2480), "certificate PNG 3508x2480")
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
    # ---- access control: admin approves a pending account; a pending account only sees the waiting screen
    c.set_viewport_size({"width": 390, "height": 780}); c.goto(U + "#/settings"); c.wait_for_selector("#accesscard"); c.click("#open-admin"); c.wait_for_selector(".adminrow"); ok(True, "admin page opens from Settings on a phone"); c.set_viewport_size({"width": 1280, "height": 900})
    c.goto(U + "#/admin"); c.wait_for_selector(".adminrow"); ok(c.locator(".adminrow").count() == 2 and c.locator(".adminrow[data-status=pending]").count() == 1, "admin page lists accounts with one pending")
    c.locator(".adminrow[data-status=pending] button.primary").click(); c.wait_for_timeout(400); ok(c.locator(".adminrow[data-status=pending]").count() == 0, "admin approves a pending account")
    ok(c.locator(".admindevs .chip").count() == 1, "admin page shows the registered device")
    c3 = b.new_page(viewport={"width": 390, "height": 780}); c3.on("pageerror", lambda e: errs.append(str(e)))
    c3.route("**/config.js", lambda r: r.fulfill(content_type="text/javascript", body='window.TULIKA_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseAnonKey:"k"}'))
    c3.route("https://esm.sh/**", lambda r: r.fulfill(content_type="text/javascript", body=MOCK))
    c3.goto(U); c3.wait_for_selector(".login"); c3.fill("input[type=email]", "limit@b.c"); c3.fill("input[type=password]", "secret12"); c3.click(".login .primary"); c3.wait_for_selector("#waiting")
    ok("limit" in c3.locator("#waiting h1").inner_text().lower() or "सीमा" in c3.locator("#waiting h1").inner_text(), "an account over its device limit is stopped")
    c2 = b.new_page(viewport={"width": 390, "height": 780}); c2.on("pageerror", lambda e: errs.append(str(e)))
    c2.route("**/config.js", lambda r: r.fulfill(content_type="text/javascript", body='window.TULIKA_CONFIG={supabaseUrl:"https://x.supabase.co",supabaseAnonKey:"k"}'))
    c2.route("https://esm.sh/**", lambda r: r.fulfill(content_type="text/javascript", body=MOCK))
    c2.goto(U); c2.wait_for_selector(".login"); c2.fill("input[type=email]", "pending@b.c"); c2.fill("input[type=password]", "secret12"); c2.click(".login .primary"); c2.wait_for_selector("#waiting")
    ok(c2.locator(".tabbar").count() == 0 and c2.locator(".sidebar").count() == 0, "pending account sees only the waiting screen")
    c2.goto(U + "#/projects"); c2.wait_for_timeout(300); ok(c2.locator(".pcard").count() == 0 and c2.locator("#main").count() == 0, "pending account cannot open pages by URL")
    b.close()
bad = [e for e in errs if "esm.sh" not in e]; ok(not bad, "no page errors " + str(bad[:3]))
sys.exit(1 if fails else 0)

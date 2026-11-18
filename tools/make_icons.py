#!/usr/bin/env python3
"""Generate original Tulika icons + logos (no upstream artwork) for the four apps.
Everything is drawn from simple geometry below; outputs keep the upstream file names so the
Rust code (include_bytes!) and packaging scripts keep working."""
import os, struct, subprocess, sys, shutil, tempfile

REPO = "/home/claude/newcraft"
APPS = {
    # app dir: (file prefix, c1, c2, glyph)
    "vector": ("vectorcraft", "#14b8a6", "#0f766e", "vector"),
    "photo":  ("photocraft",  "#f43f8e", "#9d174d", "photo"),
    "film":   ("filmcraft",   "#8b5cf6", "#4c1d95", "film"),
    "pdf":    ("pdfcraft",    "#f59e0b", "#b45309", "pdf"),
}

def glyph(kind):
    w = 'fill="#fff"'
    s = 'fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"'
    if kind == "vector":   # bezier curve with anchor points and handles
        return f'''
  <path d="M130 360 C 170 130, 342 130, 382 360" {s} stroke-width="26"/>
  <path d="M130 360 L 170 130 M382 360 L 342 130" {s} stroke-width="8" opacity=".55"/>
  <rect x="100" y="330" width="60" height="60" rx="10" {w}/>
  <rect x="352" y="330" width="60" height="60" rx="10" {w}/>
  <circle cx="170" cy="130" r="22" {w}/><circle cx="342" cy="130" r="22" {w}/>'''
    if kind == "photo":    # mountains + sun
        return f'''
  <path d="M84 392 L 206 214 L 276 312 L 336 236 L 428 392 Z" {w} stroke="#fff" stroke-width="14" stroke-linejoin="round"/>
  <circle cx="352" cy="150" r="42" {w}/>'''
    if kind == "film":     # frame with play triangle and sprocket holes
        holes = "".join(f'<rect x="{x}" y="{y}" width="26" height="26" rx="6" {w}/>' for x in (92, 394) for y in (150, 224, 298))
        return f'''
  <rect x="136" y="116" width="240" height="280" rx="34" {s} stroke-width="24"/>
  <path d="M222 190 L 222 322 L 332 256 Z" {w}/>{holes}'''
    if kind == "pdf":      # page with folded corner and text lines
        return f'''
  <path d="M142 84 H 314 L 392 162 V 428 H 142 Z" {w}/>
  <path d="M314 84 L 392 162 H 314 Z" fill="#000" opacity=".22"/>
  <rect x="186" y="236" width="162" height="22" rx="11" fill="CLR"/><rect x="186" y="290" width="162" height="22" rx="11" fill="CLR"/>
  <rect x="186" y="344" width="104" height="22" rx="11" fill="CLR"/>'''
    raise SystemExit("unknown glyph")

def tile_svg(c1, c2, kind):
    g = glyph(kind).replace("CLR", c2)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>{g}
</svg>
'''

def doc_icon_svg(c1, c2):  # document-type icon (pdf files)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path d="M120 40 H 328 L 416 128 V 472 H 120 Z" fill="#fff" stroke="{c2}" stroke-width="20" stroke-linejoin="round"/>
  <path d="M328 40 L 416 128 H 328 Z" fill="{c1}"/>
  <rect x="120" y="300" width="296" height="110" fill="{c1}"/>
  <path d="M170 372 L 200 338 L 230 372 M 255 338 V 372 M 290 338 H 330 V 372 H 290 Z" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'''

def mark_svg(ink):
    # suite mark: brush ("tulika") stroke with a dot
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path d="M120 400 C 190 310, 300 230, 392 118" fill="none" stroke="{ink}" stroke-width="64" stroke-linecap="round"/>
  <path d="M392 118 C 410 98, 440 84, 452 60 C 446 100, 432 138, 392 118 Z" fill="{ink}"/>
  <circle cx="130" cy="130" r="34" fill="{ink}"/>
</svg>
'''

def wordmark_svg(ink):
    # "TULIKA" drawn from strokes (no fonts needed, so it renders everywhere)
    p = ('M20 20 H120 M70 20 V100'                                   # T
         ' M190 20 V68 a30 32 0 0 0 60 0 V20'                          # U
         ' M320 20 V100 H390'                                          # L
         ' M450 20 V100'                                               # I
         ' M520 20 V100 M590 20 L520 64 M545 52 L595 100'              # K
         ' M650 100 L690 20 L730 100 M663 76 H717')                    # A
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 120" width="760" height="120">
  <path d="{p}" fill="none" stroke="{ink}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
'''

def render(svg, size, out, width=None, height=None):
    cmd = ["rsvg-convert", "-w", str(width or size), "-h", str(height or size), "-o", out, svg]
    subprocess.run(cmd, check=True)

def write_icns(path, pngs):
    types = {128: b"ic07", 256: b"ic08", 512: b"ic09", 1024: b"ic10"}
    body = b""
    for sz, png in pngs.items():
        data = open(png, "rb").read()
        body += types[sz] + struct.pack(">I", len(data) + 8) + data
    open(path, "wb").write(b"icns" + struct.pack(">I", len(body) + 8) + body)

def write_ico(path, pngs):
    entries, blobs, off = b"", b"", 6 + 16 * len(pngs)
    for sz, png in pngs:
        data = open(png, "rb").read()
        entries += struct.pack("<BBBBHHII", sz % 256, sz % 256, 0, 0, 1, 32, len(data), off)
        blobs += data; off += len(data)
    open(path, "wb").write(struct.pack("<HHH", 0, 1, len(pngs)) + entries + blobs)

ATTR = """file:         {name}
author:       Tulika project (generated from geometric shapes in tools/make_icons.py)
source:       original work; contains no third-party or upstream artwork
licence:      MIT OR Apache-2.0
notes:        Tulika {title} application icon
"""

def make_app(app):
    prefix, c1, c2, kind = APPS[app]
    title = {"vector": "Vector", "photo": "Photo", "film": "Film", "pdf": "PDF"}[app]
    d = os.path.join(REPO, "apps", app, "assets", "app-icon")
    tmp = tempfile.mkdtemp()
    svg = os.path.join(tmp, "tile.svg"); open(svg, "w").write(tile_svg(c1, c2, kind))
    mac = os.path.join(tmp, "mac.svg")
    open(mac, "w").write(open(svg).read().replace('viewBox="0 0 512 512"', 'viewBox="-62.136 -62.136 636.272 636.272"'))
    shutil.copy(svg, os.path.join(d, f"{prefix}.svg")); shutil.copy(svg, os.path.join(d, f"{prefix}-small.svg"))
    render(svg, 1024, os.path.join(d, f"{prefix}-1024.png"))
    if os.path.exists(os.path.join(d, f"{prefix}-macos-512.png")):
        render(mac, 512, os.path.join(d, f"{prefix}-macos-512.png"))
    ident = [n for n in os.listdir(os.path.join(d, "hicolor", "128x128", "apps"))][0][:-4]  # id without .png
    for s in (16, 24, 32, 48, 64, 128, 256, 512):
        render(svg, s, os.path.join(d, "hicolor", f"{s}x{s}", "apps", ident + ".png"))
    shutil.copy(os.path.join(d, f"{prefix}-small.svg"), os.path.join(d, "hicolor", "scalable", "apps", ident + ".svg"))
    ico = []
    for s in (16, 24, 32, 48, 64, 128, 256):
        p = os.path.join(tmp, f"i{s}.png"); render(svg, s, p); ico.append((s, p))
    write_ico(os.path.join(d, f"{prefix}.ico"), ico)
    pn = {}
    for s in (128, 256, 512, 1024):
        p = os.path.join(tmp, f"m{s}.png"); render(mac, s, p); pn[s] = p
    write_icns(os.path.join(d, f"{prefix}.icns"), pn)
    if app == "pdf":  # document-type icon
        dsvg = os.path.join(tmp, "doc.svg"); open(dsvg, "w").write(doc_icon_svg(c1, c2))
        shutil.copy(dsvg, os.path.join(d, "pdfcraft-document.svg"))
        di = []
        for s in (16, 24, 32, 48, 64, 128, 256):
            p = os.path.join(tmp, f"d{s}.png"); render(dsvg, s, p); di.append((s, p))
        write_ico(os.path.join(d, "pdfcraft-document.ico"), di)
    if app == "film":
        fav = os.path.join(REPO, "apps/film/apps/filmcraft-web/web/favicon.png")
        if os.path.exists(fav): render(svg, 64, fav)
    # provenance files: replace upstream notes with ours
    for root, _, files in os.walk(os.path.join(REPO, "apps", app)):
        if "/vendor" in root or "/.git" in root: continue
        for f in files:
            if f.endswith(".attribution") and ("app-icon" in root or "favicon" in f):
                open(os.path.join(root, f), "w").write(ATTR.format(name=f[:-12], title=title))
    # app-icon README/LICENSE text
    for f in ("README.md", "LICENSE.txt"):
        p = os.path.join(d, f)
        if os.path.exists(p):
            open(p, "w").write(f"Tulika {title} icons: original artwork generated by tools/make_icons.py, MIT OR Apache-2.0.\n")
    # docs/brand
    b = os.path.join(REPO, "apps", app, "docs", "brand"); os.makedirs(b, exist_ok=True)
    for name, ink in (("tulika-logo", "#111827"), ("tulika-logo-white", "#ffffff")):
        sv = os.path.join(b, name + ".svg"); open(sv, "w").write(wordmark_svg(ink))
        render(sv, 0, os.path.join(b, name + ".png"), width=3200, height=505)
    for name, ink in (("tulika-mark", "#0f766e"), ("tulika-mark-black", "#000000")):
        sv = os.path.join(b, name + ".svg"); open(sv, "w").write(mark_svg(ink))
        render(sv, 1024, os.path.join(b, name + ".png"))
    open(os.path.join(b, "README.txt"), "w").write(
        "Tulika logos and marks: original artwork generated by tools/make_icons.py (geometric shapes).\n"
        "Licensed MIT OR Apache-2.0 like the rest of this repository.\n")
    shutil.rmtree(tmp)
    print("icons done:", app)

if __name__ == "__main__":
    for a in (sys.argv[1:] or APPS): make_app(a)

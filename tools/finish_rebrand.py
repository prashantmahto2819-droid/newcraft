#!/usr/bin/env python3
"""Second pass: bundle ids, company name, installer GUIDs, brand paths, stray translations,
nested upstream agent files and READMEs. Text-only, mechanical, consistent across the tree."""
import os, re, uuid, shutil

REPO = "/home/claude/newcraft"
APPS = os.path.join(REPO, "apps")
IDS = {
    "ai.storyteller.vectorcraft": "in.tulika.vector",
    "ai.storyteller.photocraft": "in.tulika.photo",
    "ai.storyteller.filmcraft": "in.tulika.film",
    "ai.storyteller.pdfcraft": "in.tulika.pdf",
}
SKIP_DIR = {".git", "vendor", "licenses", "target", "node_modules"}
BIN_EXT = {".png", ".ico", ".icns", ".jpg", ".jpeg", ".gif", ".webp", ".ttf", ".otf", ".woff", ".woff2", ".pdf",
           ".psd", ".tiff", ".tif", ".bin", ".gz", ".zip", ".wasm", ".dll", ".exe", ".so", ".o", ".a", ".rlib", ".lut", ".cube", ".icc", ".icm"}
SKIP_FILE = re.compile(r"^(NOTICE|ATTRIBUTION\.(md|toml)|ASSETS\.md|Cargo\.lock)$")

def textfiles():
    for dp, dns, fns in os.walk(APPS):
        dns[:] = [d for d in dns if d not in SKIP_DIR]
        for fn in fns:
            if os.path.splitext(fn)[1].lower() in BIN_EXT or SKIP_FILE.match(fn): continue
            p = os.path.join(dp, fn)
            try:
                if os.path.getsize(p) > 6_000_000: continue
                yield p, open(p, encoding="utf-8").read()
            except Exception:
                continue

# collect GUID mapping from the four wxs files
guid_map = {}
for dp, _, fns in os.walk(APPS):
    for fn in fns:
        if fn.endswith(".wxs"):
            for g in re.findall(r'UpgradeCode="([0-9A-Fa-f-]{36})"', open(os.path.join(dp, fn), encoding="utf-8").read()):
                guid_map.setdefault(g, str(uuid.uuid4()).upper())

n_changed = 0
for p, s in textfiles():
    o = s
    for a, b in IDS.items(): s = s.replace(a, b)
    s = s.replace("Learning Machines LLC (DJ6XS33FX8)", "Tulika project").replace("Learning Machines LLC", "Tulika project").replace("Learning Machines Inc", "Tulika project")
    for a, b in guid_map.items(): s = re.sub(re.escape(a), b, s, flags=re.I)
    # leftover inflected forms in two translations
    s = s.replace("ArtCrafta", "Tulika").replace("ArtCrafts", "Tulika")
    # brand file names
    s = s.replace("artcraft-logo-white", "tulika-logo-white").replace("artcraft-logo", "tulika-logo").replace("artcraft-mark", "tulika-mark").replace("artcraft-wordmark", "tulika-wordmark")
    if s != o:
        open(p, "w", encoding="utf-8").write(s); n_changed += 1
print("text files changed:", n_changed)

# rename files/dirs whose names carry the old ids (deepest first)
renamed = 0
for dp, dns, fns in os.walk(APPS, topdown=False):
    if any(x in dp.split(os.sep) for x in SKIP_DIR): continue
    for fn in fns + dns:
        new = fn
        for a, b in IDS.items(): new = new.replace(a, b)
        if new != fn:
            os.rename(os.path.join(dp, fn), os.path.join(dp, new)); renamed += 1
print("renamed:", renamed)

# nested upstream agent instructions and READMEs
for app, title, desc, up in (("vector", "Tulika Vector", "vector illustration", "VectorCraft"),
                             ("photo", "Tulika Photo", "image editor", "PhotoCraft"),
                             ("film", "Tulika Film", "video editor", "FilmCraft"),
                             ("pdf", "Tulika PDF", "PDF workbench", "PdfCraft")):
    d = os.path.join(APPS, app)
    for f in ("AGENTS.md", "CLAUDE.md"):
        if os.path.exists(os.path.join(d, f)): os.remove(os.path.join(d, f))
    open(os.path.join(d, "README.md"), "w", encoding="utf-8").write(f"""<p align="center"><img alt="Tulika" src="docs/brand/tulika-logo.svg" width="220"></p>

# {title}

Free, open-source, native {desc} written in Rust. Part of the Tulika suite
(Tulika Vector, Tulika Photo, Tulika Film, Tulika PDF).

## Origin and licence

{title} is a modified version of **{up}** by the ArtCraft team and contributors
(https://github.com/storytold), used under the MIT or Apache-2.0 licence at your option.
The original copyright and licence notices are kept in [`LICENSE-MIT`](LICENSE-MIT),
[`LICENSE-APACHE`](LICENSE-APACHE) and [`NOTICE`](NOTICE). This is an independent fork: it is not
made, endorsed or supported by the ArtCraft team, and it does not use their name, logos or icons.

The Tulika logos and icons in this repository are original artwork under MIT OR Apache-2.0.

## Build

See [`../../docs/BUILDING.md`](../../docs/BUILDING.md) for desktop, web and installer builds.
""")
print("readmes written, nested AGENTS/CLAUDE removed")

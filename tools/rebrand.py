#!/usr/bin/env python3
"""Tulika rebrand: change user-visible product names only, never Rust identifiers.

Usage: rebrand.py <app_dir> [--dry]
Keeps: crate names, identifiers, lowercase paths, git dependency URLs,
and all attribution/licence files (upstream credit is required by MIT/Apache-2.0).
"""
import os, re, sys, shutil

ROOT = sys.argv[1]
DRY = "--dry" in sys.argv

REPO = "https://github.com/prashantmahto2819-droid/newcraft"
APP_SLUG = {"vector": "vectorcraft", "photo": "photocraft", "film": "filmcraft", "pdf": "pdfcraft"}
APP = os.path.basename(os.path.normpath(ROOT))

# display-name map (only our four apps + the old PrintCraft name of the PDF app)
NAMES = {
    "VectorCraft": "Tulika Vector",
    "PhotoCraft": "Tulika Photo",
    "FilmCraft": "Tulika Film",
    "PdfCraft": "Tulika PDF",
    "PrintCraft": "Tulika PDF",
}

LB = r"(?<![A-Za-z0-9_])"          # not preceded by identifier char
LA = r"(?![A-Za-z0-9_]|\.[A-Za-z0-9])"  # not followed by identifier char / file ext
LB_ESC = r"(?:(?<![A-Za-z0-9_])|(?<=\\[ntr]))"  # also allow right after \n \t \r escapes

def url_rules(slug):
    return [
        (re.compile(r"https://getartcraft\.com/apps/" + slug), f"{REPO}/tree/main/apps/{APP}"),
        (re.compile(r"getartcraft\.com/apps/" + slug), f"github.com/prashantmahto2819-droid/newcraft/tree/main/apps/{APP}"),
        (re.compile(r"https://discord\.gg/artcraft"), f"{REPO}/discussions"),
        (re.compile(r"discord\.gg/artcraft"), "github.com/prashantmahto2819-droid/newcraft/discussions"),
        (re.compile(r"https://getartcraft\.com/?(?![A-Za-z0-9/])"), REPO),
        (re.compile(r"getartcraft\.com"), "github.com/prashantmahto2819-droid/newcraft"),
    ]

RULES = url_rules(APP_SLUG[APP])
for old, new in NAMES.items():
    RULES.append((re.compile(LB_ESC + old + LA), new))
RULES.append((re.compile(LB_ESC + r"ArtCraft" + LA), "Tulika"))
RULES.append((re.compile(LB + r"Discord" + LA), "GitHub Discussions"))  # only used inside user-facing strings

def sub_text(s):
    for rx, new in RULES:
        s = rx.sub(new, s)
    return s

# ---------- Rust: only strings and comments ----------
def rust_rewrite(src):
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        two = src[i:i+2]
        if two == "//":
            j = src.find("\n", i)
            j = n if j < 0 else j
            out.append(sub_text(src[i:j])); i = j
        elif two == "/*":
            depth, j = 1, i + 2
            while j < n and depth:
                if src.startswith("/*", j): depth += 1; j += 2
                elif src.startswith("*/", j): depth -= 1; j += 2
                else: j += 1
            out.append(sub_text(src[i:j])); i = j
        elif c in "rb" and re.match(r'(?:br|r|b)#*"', src[i:i+8]) and (i == 0 or not (src[i-1].isalnum() or src[i-1] == "_")):
            m = re.match(r'(b?r?)(#*)"', src[i:])
            prefix, hashes = m.group(1), m.group(2)
            start = i + m.end()
            if "r" in prefix:
                end_tok = '"' + hashes
                k = src.find(end_tok, start)
                k = n if k < 0 else k
                out.append(src[i:start]); out.append(sub_text(src[start:k])); out.append(src[k:k + len(end_tok)])
                i = min(n, k + len(end_tok))
            else:  # b"..."
                j = start
                while j < n and src[j] != '"':
                    j += 2 if src[j] == "\\" else 1
                out.append(src[i:start]); out.append(sub_text(src[start:j])); out.append('"'); i = j + 1
        elif c == '"':
            j = i + 1
            while j < n and src[j] != '"':
                j += 2 if src[j] == "\\" else 1
            out.append('"'); out.append(sub_text(src[i+1:j])); out.append('"'); i = j + 1
        elif c == "'":
            # char literal like 'x' '\n' '\'' '"' ; otherwise a lifetime
            m = re.match(r"'(?:\\.[^']*|[^\\'])'", src[i:i+12])
            if m: out.append(m.group(0)); i += m.end()
            else: out.append(c); i += 1
        else:
            out.append(c); i += 1
    return "".join(out)

# ---------- WiX: only display-type attributes ----------
WIX_ATTR = re.compile(r'(\b(?:Name|Value|Description|Manufacturer|Title|Text|Comments|Keywords|Message|Label|Target)=")([^"]*)(")')
def wix_rewrite(src):
    def f(m):
        key, val, q = m.groups()
        if m.group(1).startswith("Target"):  # shortcut targets are ids
            return m.group(0)
        return key + sub_text(val) + q
    out = WIX_ATTR.sub(f, src)
    # wxl localisation text nodes
    out = re.sub(r">([^<>]*)<", lambda m: ">" + sub_text(m.group(1)) + "<", out) if src.lstrip().startswith("<WixLocalization") else out
    return out

TEXT_EXT = {".rs", ".md", ".txt", ".tsv", ".toml", ".sh", ".ps1", ".json", ".xml", ".in", ".desktop",
            ".plist", ".html", ".js", ".ts", ".css", ".yaml", ".yml", ".wxs", ".wxi", ".wxl", ".svg", ".py", ".nsi", ".cfg", ".ini"}
SKIP_DIR = {".git", "licenses", "vendor", "target", "node_modules", ".github", "brand"}
SKIP_FILE = re.compile(r"^(NOTICE|ATTRIBUTION\.(md|toml)|ASSETS\.md|LICENSES?(-[A-Z0-9]+)?(\.(md|txt|toml))?|Cargo\.lock|deny\.toml|ROADMAP\.md|CHANGELOG\.md)$")

changed, scanned = 0, 0
for dp, dns, fns in os.walk(ROOT):
    dns[:] = [d for d in dns if d not in SKIP_DIR]
    for fn in fns:
        ext = os.path.splitext(fn)[1].lower()
        if ext not in TEXT_EXT or SKIP_FILE.match(fn):
            continue
        p = os.path.join(dp, fn)
        try:
            if os.path.getsize(p) > 6_000_000: continue
            src = open(p, encoding="utf-8").read()
        except Exception:
            continue
        scanned += 1
        if ext == ".rs": new = rust_rewrite(src)
        elif ext in (".wxs", ".wxi", ".wxl"): new = wix_rewrite(src)
        elif ext == ".toml" and fn == "Cargo.toml":
            # only descriptive string values, never git/path/name keys
            new = re.sub(r'^((?:description|title|product-name|display-name|long_description|homepage|documentation)\s*=\s*")([^"]*)(")',
                         lambda m: m.group(1) + sub_text(m.group(2)) + m.group(3), src, flags=re.M)
        else: new = sub_text(src)
        if new != src:
            changed += 1
            if not DRY: open(p, "w", encoding="utf-8").write(new)

# remove ArtCraft trademark assets (terms forbid shipping them in a fork)
brand = os.path.join(ROOT, "docs", "brand")
removed = os.path.isdir(brand)
if removed and not DRY: shutil.rmtree(brand)
# nested upstream CI is inert inside a monorepo; keep a reference copy outside the app tree
gh = os.path.join(ROOT, ".github")
if os.path.isdir(gh) and not DRY:
    ref = os.path.join(os.path.dirname(os.path.dirname(ROOT)), "shared", "upstream-ci", APP)
    os.makedirs(os.path.dirname(ref), exist_ok=True)
    shutil.move(gh, ref)
print(f"{APP}: scanned={scanned} changed={changed} brand_removed={removed}")

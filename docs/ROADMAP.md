# Tulika roadmap (what is left, in order)

Legend: **[me]** can be done in the authoring sandbox · **[user]** needs the owner · **[ci]** only CI can verify (nothing compiles locally).

## A. Go live (user)
1. Run `0001` then `0002` migrations in Supabase SQL Editor.
2. Add GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`; variable `DEPLOY_PAGES=true`.
3. Actions → *web* → Run workflow (apps: vector, photo, pdf). Optional: custom domain in Cloudflare Pages.
4. Trademark search for "Tulika" (IP India, WIPO) before public launch.
5. Tag `v0.1.0` to publish desktop installers (costs ~Windows 2x / macOS 10x minutes; do it once).

## B. Product work
| # | Item | Who | Notes |
|---|------|-----|-------|
| 1 | Web apps open/save projects via Supabase (`?project=<id>` bridge, JS ↔ WASM file I/O) | me + ci | biggest missing feature; needs a small JS shim loaded by each Trunk `index.html` and a file-open hook in each app |
| 2 | Hindi UI catalogs for photo / pdf / film | me + ci | vector has `hi.tsv`; copy its format |
| 3 | Real installers (MSI / DMG / AppImage) and `tulika-*` binary names | me + ci | today CI ships zip/tar.gz with upstream binary names inside |
| 4 | Devanagari fonts bundled in apps (Noto Sans/Serif Devanagari, Mukta, Hind) | me | check licences (OFL) and add to NOTICE |
| 5 | Film web build (no `Trunk.toml` upstream) | me + ci | optional; desktop only for now |
| 6 | Dashboard: real thumbnails (apps export a PNG preview), sharing links, folders/tags | me | needs #1 first |
| 7 | Dashboard: storage quota per plan, admin page | me | later |
| 8 | Auto-update checks in desktop apps | me + ci | after installers |
| 9 | Replace `in.tulika.*` bundle ids when a domain is owned | user | |

## C. Quality
* `python3 tools/test_dashboard.py` — dashboard smoke test (demo + mocked Supabase). Run after every dashboard change.
* Re-run `tools/rebrand.py` + `tools/finish_rebrand.py` after importing upstream changes (docs/UPSTREAM.md).
* Trust CI over assumptions for Rust.

## D. Module plan (decided 2026-11-20)
Licence rule: GPL apps (Blender, Krita, Inkscape, Scribus, Synfig, FontForge, OBS, Audacity) can NOT be merged into our MIT/Apache code.
Either link/launch them as separate apps (done: Tools page) or write our own from scratch (permissive crates only). AI models have their own
licences (BRIA RMBG-1.4 is non-commercial; rembg code is MIT) — check each model before shipping.

| Module | Replaces | How | Status |
|---|---|---|---|
| Tools page, 12 tools: background remover, enhancer, upscale, compressor (+under-KB), crop/presets, watermark, passport sheet, images→PDF, QR (URL/UPI/WhatsApp/Wi-Fi), Kruti→Unicode, rupees in words, print-size calc | misc. | pure JS, offline | **done 2026-11-20** (tested: tools/test_dashboard.py) |
| Tools next: PDF merge/split/compress (needs pdf-lib vendored; no npm in sandbox), OCR Hindi (tesseract.js), AI upscale/enhance (ONNX), Hindi subtitles (whisper.cpp), barcode (Code128/EAN), ID/visiting-card generator, vendor transformers.js locally for the AI bg-remove (today loaded from esm.sh) | | JS/WASM in dashboard | next |
| Tulika Layout (multi-page DTP: CMYK, bleed, crop marks, print PDF) | InDesign / PageMaker | new Rust app or mode of Vector; Scribus only as reference | planned, biggest market |
| Tulika Audio | Audition / Audacity | Rust: cpal + symphonia + rubato + hound | planned |
| Tulika Motion (text/shape animation, lower thirds) | After Effects (lite) | extend Film | planned |
| Tulika Lab (batch edit, presets, RAW) | Lightroom | extend Photo | planned |
| Brush engine | Krita | extend Photo | planned |
| Devanagari shaping check (matras, conjuncts) in every app | | verify rustybuzz/swash path in each app; add OFL fonts | planned, high priority |
| UI/mockup | Figma / XD | link Penpot (MPL-2.0, self-hostable) | linked |
| 3D, 2D animation, font editor, screen recorder | Blender, Synfig, FontForge, OBS | link only | linked |

Note: Rust modules cannot be compiled in the authoring sandbox — each needs CI runs to verify.

Tools status notes (2026-11-20): AI background removal (`Xenova/modnet`, Apache-2.0, portrait only) is **experimental and untested** (sandbox has no network);
plain-background removal, enhancer, upscale (smooth scaling + sharpen, NOT AI) are tested. Kruti→Unicode is beta (mapping from memory, rare conjuncts missing).
QR: own encoder, byte mode, ECC M, up to 213 bytes (v1–v10); verified 160/160 version×mask combinations with OpenCV's Aruco QR decoder.

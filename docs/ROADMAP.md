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

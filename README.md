# Tulika (तूलिका)

Free, open-source creative suite — a CorelDRAW / Adobe-style set of apps written in Rust, running as
native desktop apps (Windows, macOS, Linux) and in the browser.

| App | What it does | Web | Desktop |
|---|---|---|---|
| **Tulika Vector** | vector illustration, logos, SVG/PDF | yes | yes |
| **Tulika Photo** | image editing, layers, masks, PSD files | yes | yes |
| **Tulika PDF** | read, edit, organise, sign PDFs | yes | yes |
| **Tulika Film** | video editor | not yet | yes (alpha) |

## Layout

```
apps/vector  apps/photo  apps/pdf  apps/film   the four apps (each is its own Cargo workspace)
platform/web          Tulika home dashboard: login + project list (static site for Cloudflare Pages)
platform/supabase     database schema (accounts, projects, brand kits) with row level security
shared/               upstream commit record, reference copy of upstream CI
docs/                 BUILDING.md, UPSTREAM.md, TRADEMARK-CHECKLIST.md
tools/                scripts used to rebrand and to generate the original icons/logos
.github/workflows     desktop.yml (Windows/macOS/Linux binaries), web.yml (WASM + Cloudflare Pages)
```

## Origin and licence

The apps are modified versions of open-source projects by the ArtCraft team and contributors, used under
MIT OR Apache-2.0 — see [NOTICE](NOTICE). This is an independent fork: not made or endorsed by ArtCraft,
and it uses none of their names, logos or icons. Tulika's own code, logos and icons are MIT OR Apache-2.0.

Start with [docs/BUILDING.md](docs/BUILDING.md).

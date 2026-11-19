# Building Tulika

Requirements: Rust stable (the apps use edition 2024), and on Linux the libraries listed in
`.github/workflows/desktop.yml`.

## Desktop (per app)
```bash
cd apps/vector && cargo build --release -p vectorcraft      # binary: target/release/vectorcraft
cd apps/photo  && cargo build --release -p photocraft
cd apps/pdf    && cargo build --release -p pdfcraft
cd apps/film   && cargo build --release -p filmcraft
```
Internal crate and binary names keep the upstream `*craft` spelling on purpose: it keeps merges from
upstream easy. User-visible names (window titles, installers, menus, icons) are all "Tulika …".

## Web (WASM)
```bash
rustup target add wasm32-unknown-unknown && cargo install trunk --locked
cd apps/vector/apps/vectorcraft-web && trunk build --release      # output: apps/vector/dist/web
```
Same for `photocraft-web` and `pdfcraft-web`.

## Automatic builds
* Push to `main` → `desktop.yml` builds all four apps on Windows, macOS and Linux (artifacts, 14 days).
* Tag `v0.1.0` → the same workflow attaches the binaries to a GitHub release.
* `web.yml` builds the three web apps; set repository variable `DEPLOY_PAGES=true` and secrets
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` to deploy the
  dashboard + apps to a Cloudflare Pages project named `tulika`.

## Supabase
Run `platform/supabase/migrations/0001_tulika_init.sql` once (SQL editor or `supabase db push`).
The dashboard lists a user's projects; saving from inside the web apps to Supabase is not wired up yet.

## Not verified yet
The rebrand was done without compiling (package downloads were blocked in the authoring session).
The first CI run is the real test — fix any compile error it reports before tagging a release.
Installers (MSI, DMG, Flatpak, AppImage) still use upstream `packaging/` scripts and are not in CI yet.

## CI cost warning
The first test run (12 desktop builds + 3 web builds, several hours of machine time) used up the GitHub Actions
quota of the account and further jobs were refused ("recent account payments have failed or your spending limit
needs to be increased"). Windows minutes count 2x and macOS 10x on private repositories. Therefore the workflows now
start only manually (default: Linux only) or on a `v*` tag. Fix the billing/spending limit in GitHub → Settings →
Billing, or make the repository public (Actions are free for public repositories).

Verified (see docs/PROJECT_LOG.md 2026-11-19): all four apps build on Linux and macOS and Windows except photo-on-Windows (unknown); web builds OK for vector, photo, pdf.

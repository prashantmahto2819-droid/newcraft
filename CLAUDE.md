# Tulika monorepo — working notes

**Before editing anything: read `docs/CODE_MAP.md` (where things live) and the end of `docs/PROJECT_LOG.md` (current state).
Do not re-read whole apps. After every change append a dated entry to `docs/PROJECT_LOG.md`, and update `docs/CODE_MAP.md`
if you add/move/rename anything.**

* Four independent Rust workspaces under `apps/` (vector, photo, pdf, film). Build with `cargo` inside the app directory.
* Do NOT rename internal crates/identifiers (`vectorcraft_*`, `PhotocraftApp`…): only user-visible strings are rebranded.
* Never add upstream ArtCraft logos/icons; all brand art comes from `tools/make_icons.py`.
* Keep `NOTICE`, `LICENSE-*`, `ATTRIBUTION.md` in each app untouched (required by MIT/Apache).
* The rebrand scripts in `tools/` are idempotent text rewriters; re-run after importing upstream changes (see docs/UPSTREAM.md).
* Nothing has been compiled yet in the authoring environment — trust CI results over assumptions.

# Merging upstream updates

The snapshot each app started from is in `shared/UPSTREAM_COMMITS.txt`.
To pull newer upstream code: clone `https://github.com/storytold/<vectorcraft|photocraft|pdfcraft|filmcraft>`,
diff its `HEAD` against the recorded commit, apply the patch under `apps/<app>/`, then re-run
`python3 tools/rebrand.py apps/<app>` and `python3 tools/finish_rebrand.py`. Never copy their
`docs/brand/` logos or app icons back in: their terms forbid shipping them in a fork.
Keep `NOTICE`, `LICENSE-MIT`, `LICENSE-APACHE` and `ATTRIBUTION.md` inside each app unchanged.

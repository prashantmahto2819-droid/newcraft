#!/usr/bin/env bash
# Builds the ./site folder that CI uploads to Cloudflare Pages.
#   platform/web (dashboard + tools)  +  <artifacts>/web-<app> for each wasm app  +  config.js
# Cloudflare Pages rejects any single file over 25 MiB. An app that has no build or has a file over
# the limit is replaced by a small "not available yet" page so the rest of the site still deploys.
# Usage: tools/assemble_site.sh [artifacts_dir]   (env: SUPABASE_URL, SUPABASE_ANON_KEY)
set -euo pipefail
art="${1:-artifacts}"
limit=26214400   # 25 MiB in bytes

rm -rf site && mkdir -p site
cp -R platform/web/. site/

stub() {
  mkdir -p "site/$1"
  cat > "site/$1/index.html" <<HTML
<!doctype html><html lang="hi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tulika $1</title>
<body style="font-family:system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 1rem;line-height:1.6">
<h2>Tulika $1 — जल्द आ रहा है</h2>
<p>इस ऐप की वेब फ़ाइल अभी Cloudflare Pages की 25 MiB सीमा से बड़ी है, इसलिए यहाँ अभी चालू नहीं है।</p>
<p><a href="../">← डैशबोर्ड पर वापस</a></p>
</body></html>
HTML
}

for a in vector photo pdf; do
  src="$art/web-$a"
  if [ ! -d "$src" ]; then echo "::notice::$a: no build in this run, placeholder page used"; stub "$a"; continue; fi
  big="$(find "$src" -type f -size +"${limit}"c -print -quit)"
  if [ -n "$big" ]; then
    echo "::warning::$a skipped: $(basename "$big") is over the 25 MiB Cloudflare Pages file limit"
    stub "$a"; continue
  fi
  mkdir -p "site/$a" && cp -R "$src/." "site/$a/"
done

printf 'window.TULIKA_CONFIG = { supabaseUrl: %s, supabaseAnonKey: %s };\n' \
  "$(printf '%s' "${SUPABASE_URL:-}" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" \
  "$(printf '%s' "${SUPABASE_ANON_KEY:-}" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" > site/config.js
find site -type f | wc -l

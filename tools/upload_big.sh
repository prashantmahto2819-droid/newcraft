#!/usr/bin/env bash
# Uploads the files that tools/assemble_site.sh left in ./r2out to the R2 bucket (default tulika-assets).
# Needs CLOUDFLARE_API_TOKEN (with Workers R2 Storage: Edit) and CLOUDFLARE_ACCOUNT_ID in the environment.
set -euo pipefail
bucket="${R2_BUCKET:-tulika-assets}"
WR="npx --yes wrangler@3.90.0"
if [ ! -s r2out/.keys ]; then echo "nothing to upload to R2"; exit 0; fi
$WR r2 bucket create "$bucket" 2>&1 | tail -2 || true   # fine if it already exists
while IFS= read -r key; do
  case "${key##*.}" in wasm) ct=application/wasm;; js) ct="text/javascript";; json) ct=application/json;; *) ct=application/octet-stream;; esac
  echo "R2 put $key ($(stat -c %s "r2out/$key") bytes)"
  $WR r2 object put "$bucket/$key" --file "r2out/$key" --content-type "$ct"
done < r2out/.keys

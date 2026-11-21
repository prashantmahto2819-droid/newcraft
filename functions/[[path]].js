// Cloudflare Pages Function. Runs only for /vector/*, /photo/*, /pdf/* (site/_routes.json).
// Pages rejects files over 25 MiB, so tools/assemble_site.sh leaves those out of the upload and
// tools/upload_big.sh puts them in the R2 bucket bound as BIG (wrangler.toml). This serves them
// from R2 at the same URL; every other file comes from the normal static assets.
let manifest = null;

async function loadManifest(context) {
  if (manifest) return manifest;
  try {
    const r = await context.env.ASSETS.fetch(new URL("/r2-manifest.json", context.request.url));
    manifest = r.ok ? new Set(await r.json()) : new Set();
  } catch (_) {
    manifest = new Set();
  }
  return manifest;
}

const TYPES = {
  wasm: "application/wasm",
  js: "text/javascript; charset=utf-8",
  json: "application/json",
  css: "text/css; charset=utf-8",
  ttf: "font/ttf",
  otf: "font/otf",
  woff2: "font/woff2",
  traineddata: "application/octet-stream",
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "GET" && request.method !== "HEAD") return context.next();
  const key = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""));
  const keys = await loadManifest(context);
  if (!env.BIG || !keys.has(key)) return context.next();
  const obj = await env.BIG.get(key);
  if (!obj) return new Response("Not found in R2: " + key, { status: 404 });
  const ext = key.split(".").pop().toLowerCase();
  const headers = new Headers();
  headers.set("content-type", TYPES[ext] || "application/octet-stream");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", obj.httpEtag);
  return new Response(request.method === "HEAD" ? null : obj.body, { headers });
}

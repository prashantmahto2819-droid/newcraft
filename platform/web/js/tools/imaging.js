// Pure pixel helpers (no DOM except canvas). All work on ImageData.
export function boxBlur(d, w, h) { // 3x3 box blur, edge-clamped, separable
  const src = d.data, tmp = new Float32Array(src.length), out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, a = (y * w + Math.max(0, x - 1)) * 4, b = (y * w + Math.min(w - 1, x + 1)) * 4; for (let c = 0; c < 4; c++) tmp[i + c] = (src[a + c] + src[i + c] + src[b + c]) / 3; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, a = (Math.max(0, y - 1) * w + x) * 4, b = (Math.min(h - 1, y + 1) * w + x) * 4; for (let c = 0; c < 4; c++) out[i + c] = (tmp[a + c] + tmp[i + c] + tmp[b + c]) / 3; }
  return new ImageData(out, w, h);
}
export function autoLevels(d, clip = 0.01) {
  const px = d.data, hist = new Uint32Array(256), n = px.length / 4;
  for (let i = 0; i < px.length; i += 4) hist[Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2])]++;
  let acc = 0, lo = 0, hi = 255; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * clip) { lo = v; break; } } acc = 0; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * clip) { hi = v; break; } }
  if (hi - lo < 16) return; const k = 255 / (hi - lo);
  for (let i = 0; i < px.length; i += 4) for (let c = 0; c < 3; c++) px[i + c] = (px[i + c] - lo) * k;
}
export function adjust(d, { brightness = 0, contrast = 0, saturation = 0 }) {
  const px = d.data, b = brightness * 2.55, c = contrast * 2.55, f = (259 * (c + 255)) / (255 * (259 - c)), s = 1 + saturation / 100;
  for (let i = 0; i < px.length; i += 4) { let r = px[i], g = px[i + 1], bl = px[i + 2]; const gray = 0.299 * r + 0.587 * g + 0.114 * bl;
    r = gray + (r - gray) * s; g = gray + (g - gray) * s; bl = gray + (bl - gray) * s; px[i] = f * (r + b - 128) + 128; px[i + 1] = f * (g + b - 128) + 128; px[i + 2] = f * (bl + b - 128) + 128; }
}
export function denoise(d, w, h, amount) { if (amount <= 0) return d; const bl = boxBlur(d, w, h), a = amount / 100; for (let i = 0; i < d.data.length; i += 4) for (let c = 0; c < 3; c++) d.data[i + c] = d.data[i + c] * (1 - a) + bl.data[i + c] * a; return d; }
export function sharpen(d, w, h, amount) { if (amount <= 0) return d; const bl = boxBlur(d, w, h), k = amount / 50; for (let i = 0; i < d.data.length; i += 4) for (let c = 0; c < 3; c++) d.data[i + c] = d.data[i + c] + (d.data[i + c] - bl.data[i + c]) * k; return d; }

// Background removal for plain backgrounds: flood-fill from the border over pixels close to the background colour.
export function removePlainBg(d, w, h, { tolerance = 40, feather = 1, bg = null }) {
  const px = d.data; let br, bgc, bb;
  if (bg) [br, bgc, bb] = bg; else { const s = []; for (let x = 0; x < w; x++) { s.push((x) * 4, ((h - 1) * w + x) * 4); } for (let y = 0; y < h; y++) { s.push(y * w * 4, (y * w + w - 1) * 4); } const med = (c) => { const a = s.map((i) => px[i + c]).sort((p, q) => p - q); return a[a.length >> 1]; }; br = med(0); bgc = med(1); bb = med(2); }
  const tol2 = tolerance * tolerance * 3, mask = new Uint8Array(w * h), seen = new Uint8Array(w * h), stack = [];
  const near = (p) => { const i = p * 4, dr = px[i] - br, dg = px[i + 1] - bgc, db = px[i + 2] - bb; return dr * dr + dg * dg + db * db <= tol2; };
  const push = (p) => { if (!seen[p]) { seen[p] = 1; if (near(p)) { mask[p] = 1; stack.push(p); } } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); } for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) { const p = stack.pop(), x = p % w, y = (p / w) | 0; if (x > 0) push(p - 1); if (x < w - 1) push(p + 1); if (y > 0) push(p - w); if (y < h - 1) push(p + w); }
  // alpha = 255 for subject, 0 for background, then soften edges
  let a = new Uint8ClampedArray(w * h); for (let p = 0; p < w * h; p++) a[p] = mask[p] ? 0 : 255;
  for (let it = 0; it < feather; it++) { const b = new Uint8ClampedArray(a); for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const p = y * w + x; b[p] = (a[p] * 4 + a[p - 1] + a[p + 1] + a[p - w] + a[p + w]) / 8; } a = b; }
  for (let p = 0; p < w * h; p++) px[p * 4 + 3] = a[p]; return d;
}
export const sampleColor = (d, w, x, y) => { const i = (y * w + x) * 4; return [d.data[i], d.data[i + 1], d.data[i + 2]]; };

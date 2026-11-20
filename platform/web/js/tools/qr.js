// QR Code encoder (byte mode, error correction M, versions 1-10 = up to 213 bytes). Written from the ISO 18004 spec; verified against OpenCV in tools/test_dashboard.py.
const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
{ let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rsEncode(data, n) {
  let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; }
  const r = new Array(n).fill(0);
  for (const d of data) { const f = d ^ r.shift(); r.push(0); if (f) for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f); }
  return r;
}
// level M: [data codewords, ec codewords per block, [blocks, data per block] x2]
const VT = [null, [16, 10, [1, 16], [0, 0]], [28, 16, [1, 28], [0, 0]], [44, 26, [1, 44], [0, 0]], [64, 18, [2, 32], [0, 0]], [86, 24, [2, 43], [0, 0]], [108, 16, [4, 27], [0, 0]],
  [124, 18, [4, 31], [0, 0]], [154, 22, [2, 38], [2, 39]], [182, 22, [3, 36], [2, 37]], [216, 26, [4, 43], [1, 44]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
export const MAX_BYTES = 213;
const bit = (v, i) => ((v >>> i) & 1) === 1;

export function qrMatrix(text, force = -1) {
  const bytes = new TextEncoder().encode(text); let ver = 0;
  for (let v = 1; v <= 10; v++) { const cc = v < 10 ? 8 : 16; if (4 + cc + bytes.length * 8 <= VT[v][0] * 8) { ver = v; break; } }
  if (!ver) throw new Error("too_long");
  const [dataCw, ecLen, g1, g2] = VT[ver], cap = dataCw * 8, bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach((b) => put(b, 8));
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0); while (bits.length % 8) bits.push(0);
  const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0xec; data.length < dataCw; pad ^= 0xec ^ 0x11) data.push(pad);
  // blocks
  const blocks = []; let p = 0;
  for (const [cnt, len] of [g1, g2]) for (let i = 0; i < cnt; i++) { const d = data.slice(p, p + len); p += len; blocks.push({ d, e: rsEncode(d, ecLen) }); }
  const out = []; const maxD = Math.max(...blocks.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.e[i]);

  const size = 17 + 4 * ver, mk = () => Array.from({ length: size }, () => new Array(size).fill(false));
  const fn = mk(), base = mk();
  const set = (x, y, v) => { if (x >= 0 && y >= 0 && x < size && y < size) { base[y][x] = v; fn[y][x] = true; } };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); }
  const al = ALIGN[ver]; for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) { if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
  const drawFormat = (m, mask) => {
    const d = (0 << 3) | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); const b = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) m[i][8] = bit(b, i); m[7][8] = bit(b, 6); m[8][8] = bit(b, 7); m[8][7] = bit(b, 8); for (let i = 9; i < 15; i++) m[8][14 - i] = bit(b, i);
    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = bit(b, i); for (let i = 8; i < 15; i++) m[size - 15 + i][8] = bit(b, i); m[size - 8][8] = true;
  };
  for (let i = 0; i < 15; i++) { /* reserve format area */ }
  const reserve = () => { for (let i = 0; i < 9; i++) { fn[i][8] = fn[8][i] = true; } for (let i = 0; i < 8; i++) { fn[8][size - 1 - i] = true; fn[size - 1 - i][8] = true; } fn[size - 8][8] = true; };
  reserve();
  if (ver >= 7) { let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25); const b = (ver << 12) | r; for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3); base[c][a] = base[a][c] = bit(b, i); fn[c][a] = fn[a][c] = true; } }
  // place data
  const m0 = base.map((r) => r.slice()); let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v; if (!fn[y][x] && k < out.length * 8) { m0[y][x] = bit(out[k >>> 3], 7 - (k & 7)); k++; } } }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  const penalty = (m) => {
    let s = 0; const rows = m.map((r) => r.map((v) => (v ? "1" : "0")).join("")), cols = []; for (let x = 0; x < size; x++) cols.push(m.map((r) => (r[x] ? "1" : "0")).join(""));
    for (const line of [...rows, ...cols]) { const runs = line.match(/0+|1+/g); for (const r of runs) if (r.length >= 5) s += 3 + r.length - 5; s += 40 * ((line.match(/(?=00001011101|10111010000)/g) || []).length); }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) s += 3;
    const dark = rows.join("").split("1").length - 1; s += Math.floor(Math.abs((dark * 20) / (size * size) - 10)) * 10; return s;
  };
  let best = null, bestP = Infinity;
  for (let mask = 0; mask < 8; mask++) { if (force >= 0 && mask !== force) continue; const m = m0.map((r, y) => r.map((v, x) => (fn[y][x] ? v : v !== MASKS[mask](x, y)))); drawFormat(m, mask); const pn = penalty(m); if (pn < bestP) { bestP = pn; best = m; } }
  return best;
}
export function qrCanvas(text, { size = 512, margin = 4, fg = "#000000", bg = "#ffffff" } = {}) {
  const m = qrMatrix(text), n = m.length, cell = Math.max(1, Math.floor(size / (n + 2 * margin))), px = cell * (n + 2 * margin);
  const c = document.createElement("canvas"); c.width = c.height = px; const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, px, px); x.fillStyle = fg;
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) if (m[y][i]) x.fillRect((i + margin) * cell, (y + margin) * cell, cell, cell); return c;
}
export function qrSvg(text, { margin = 4, fg = "#000000", bg = "#ffffff" } = {}) {
  const m = qrMatrix(text), n = m.length, t = n + 2 * margin; let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x + margin},${y + margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}

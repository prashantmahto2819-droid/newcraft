// Code 128 (set B, ASCII 32-126) and EAN-13 encoders -> string of modules ("1" = bar, "0" = space).
const C128 = "212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112".split(" ");
const bars = (pat) => { let s = "", bar = true; for (const ch of pat) { s += (bar ? "1" : "0").repeat(+ch); bar = !bar; } return s; };
export function code128(text) {
  if (!text || /[^\x20-\x7e]/.test(text)) throw new Error("ascii");
  const vals = [104, ...[...text].map((c) => c.charCodeAt(0) - 32)]; let sum = vals[0]; for (let i = 1; i < vals.length; i++) sum += vals[i] * i; vals.push(sum % 103, 106);
  return vals.map((v) => bars(C128[v])).join("");
}
const L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const R = L.map((c) => [...c].map((b) => (b === "1" ? "0" : "1")).join("")), G = R.map((c) => [...c].reverse().join(""));
const PAR = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
export const ean13Check = (d12) => { let s = 0; for (let i = 0; i < 12; i++) s += +d12[i] * (i % 2 ? 3 : 1); return (10 - (s % 10)) % 10; };
export function ean13(digits) {
  const m = /^\d{12,13}$/.exec(digits); if (!m) throw new Error("digits"); const d12 = digits.slice(0, 12), chk = ean13Check(d12);
  if (digits.length === 13 && +digits[12] !== chk) throw new Error("check"); const all = d12 + chk, par = PAR[+all[0]];
  let s = "101"; for (let i = 0; i < 6; i++) s += (par[i] === "L" ? L : G)[+all[i + 1]]; s += "01010"; for (let i = 0; i < 6; i++) s += R[+all[i + 7]]; return { modules: s + "101", full: all };
}
export function barcodeCanvas(modules, label, { scale = 4, height = 160, fg = "#000", bg = "#fff", quiet = 10 } = {}) {
  const w = (modules.length + quiet * 2) * scale, fs = Math.round(scale * 6), c = document.createElement("canvas"); c.width = w; c.height = height + (label ? fs * 1.8 : 0) + scale * 4; const x = c.getContext("2d");
  x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = fg; for (let i = 0; i < modules.length; i++) if (modules[i] === "1") x.fillRect((i + quiet) * scale, scale * 2, scale, height);
  if (label) { x.font = `${fs}px Inter, sans-serif`; x.textAlign = "center"; x.textBaseline = "top"; x.fillText(label, w / 2, height + scale * 3); } return c;
}
export function barcodeSvg(modules, label, { fg = "#000", bg = "#fff", quiet = 10, height = 40 } = {}) {
  const w = modules.length + quiet * 2; let d = ""; for (let i = 0; i < modules.length; i++) if (modules[i] === "1") d += `M${i + quiet},1h1v${height}h-1z`; const th = height + (label ? 10 : 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${th}" shape-rendering="crispEdges"><rect width="${w}" height="${th}" fill="${bg}"/><path d="${d}" fill="${fg}"/>${label ? `<text x="${w / 2}" y="${height + 8}" font-size="7" font-family="Inter,sans-serif" text-anchor="middle" fill="${fg}">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` : ""}</svg>`;
}

import { h, icon, toast, downloadBlob, debounce } from "../ui.js";
import { getLang } from "../i18n.js";
import { TEMPLATES } from "../data/catalog.js";
import { loadImg } from "../tools/pdf.js";
import { adjust, autoLevels, denoise, sharpen, removePlainBg, sampleColor } from "../tools/imaging.js";
import { qrCanvas, qrSvg, MAX_BYTES } from "../tools/qr.js";
import { rupeesInWords } from "../tools/words.js";
import { pickFile } from "./shared.js";

export const L = (hi, en) => (getLang() === "hi" ? hi : en);
const MAXPX = 2400;
export const field = (label, el) => h("label.fld", h("span", label), el);
const note = (t) => h("p.sub", t);
const sel = (opts, v, f) => h("select", { onchange: (e) => f(e.target.value) }, opts.map(([k, l]) => h("option", { value: k, selected: String(k) === String(v) }, l)));
const textIn = (v, f, o = {}) => h("input", { value: v, oninput: (e) => f(e.target.value), ...o });

// Generic single-image workbench: pick image -> controls -> live preview -> download.
function workbench({ init, controls, render, help, onClick }) {
  const p = { ...init }; let src = null, token = 0;
  const cv = h("canvas.prev"), info = h("small"), box = h("div.canvasbox", cv);
  const run = async () => { if (!src) return; const t = ++token; try { await render(src, p, cv, info); } catch (e) { if (t === token) { console.error(e); toast(L("कुछ गड़बड़ हुई", "Something went wrong") + (e?.message ? ": " + e.message : ""), "err"); } } };
  const redraw = debounce(run, 40);
  const rng = (label, key, min, max, step = 1) => { const out = h("b", String(p[key])); return h("label.fld", h("span", label, " ", out), h("input", { type: "range", min, max, step, value: p[key], oninput: (e) => { p[key] = +e.target.value; out.textContent = e.target.value; redraw(); } })); };
  const chk = (label, key) => h("label.chk", h("input", { type: "checkbox", checked: !!p[key], onchange: (e) => { p[key] = e.target.checked; redraw(); } }), label);
  let fmt = "image/png", q = 92;
  const load = async (f) => { const im = await loadImg(f), s = Math.min(1, MAXPX / Math.max(im.width, im.height)); src = document.createElement("canvas"); src.width = Math.round(im.width * s); src.height = Math.round(im.height * s); src.getContext("2d").drawImage(im, 0, 0, src.width, src.height); URL.revokeObjectURL(im.src); src.fileName = f.name; run(); };
  const save = () => { if (!src) return toast(L("पहले फ़ोटो चुनिए", "Choose a photo first"), "err"); const o = document.createElement("canvas"); o.width = cv.width; o.height = cv.height; const x = o.getContext("2d"); if (fmt === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, o.width, o.height); } x.drawImage(cv, 0, 0); o.toBlob((b) => b && downloadBlob((src.fileName || "photo").replace(/\.[^.]+$/, "") + "-tulika." + { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[fmt], b), fmt, q / 100); };
  if (onClick) { cv.style.cursor = "crosshair"; cv.addEventListener("click", (e) => src && onClick({ src, p, redraw, e, cv })); }
  const api = { p, redraw, rng, chk, sel, cv, run, getSrc: () => src };
  return h("div.form", help ? note(help) : null, h("button.ghost", { onclick: () => pickFile("image/*", load) }, icon("image", 16), L("फ़ोटो चुनिए", "Choose photo")),
    info, box, h("div.grid2", ...controls(api)), h("div.btnrow", sel([["image/png", "PNG"], ["image/jpeg", "JPG"], ["image/webp", "WebP"]], fmt, (v) => (fmt = v)), h("button.primary", { onclick: save }, icon("download", 16), L("डाउनलोड", "Download"))));
}
const withData = (src, fn) => (cv) => { cv.width = src.width; cv.height = src.height; const x = cv.getContext("2d"); x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, cv.width, cv.height); fn(d, cv.width, cv.height); x.putImageData(d, 0, 0); };

// ---- Enhancer
export const enhance = () => workbench({ init: { auto: true, brightness: 0, contrast: 0, saturation: 0, denoise: 0, sharpen: 30 },
  help: L("फ़ोटो को साफ़ और चमकदार बनाइए: ऑटो-लेवल, ब्राइटनेस, कंट्रास्ट, रंग, नॉइज़ और शार्पनेस।", "Clean up and brighten photos: auto-levels, brightness, contrast, colour, noise and sharpness."),
  controls: ({ rng, chk }) => [chk(L("ऑटो सुधार (लेवल)", "Auto levels"), "auto"), rng(L("ब्राइटनेस", "Brightness"), "brightness", -100, 100), rng(L("कंट्रास्ट", "Contrast"), "contrast", -100, 100), rng(L("रंग की गहराई", "Saturation"), "saturation", -100, 100), rng(L("नॉइज़ घटाएँ", "Denoise"), "denoise", 0, 100), rng(L("शार्पनेस", "Sharpen"), "sharpen", 0, 100)],
  render: (src, p, cv) => withData(src, (d, w, h2) => { if (p.auto) autoLevels(d); adjust(d, p); denoise(d, w, h2, p.denoise); sharpen(d, w, h2, p.sharpen); })(cv) });

// ---- Upscale
export const upscale = () => workbench({ init: { factor: 2, sharpen: 35 },
  help: L("फ़ोटो बड़ी कीजिए (2×/3×/4×) और धार तेज़ कीजिए। यह AI नहीं है: तेज़ स्मूथ स्केलिंग + शार्पन।", "Enlarge photos 2×/3×/4× with sharpening. Not AI: high-quality smooth scaling + sharpen."),
  controls: ({ p, rng, redraw }) => [field(L("कितना बड़ा", "Scale"), sel([[2, "2×"], [3, "3×"], [4, "4×"]], p.factor, (v) => { p.factor = +v; redraw(); })), rng(L("शार्पनेस", "Sharpen"), "sharpen", 0, 100)],
  render: (src, p, cv, info) => { let f = p.factor; while (f > 1 && src.width * f * src.height * f > 36e6) f--; cv.width = src.width * f; cv.height = src.height * f; const x = cv.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, cv.width, cv.height);
    if (p.sharpen) { const d = x.getImageData(0, 0, cv.width, cv.height); sharpen(d, cv.width, cv.height, p.sharpen); x.putImageData(d, 0, 0); } info.textContent = `${src.width}×${src.height} → ${cv.width}×${cv.height}px` + (f < p.factor ? L(" (बहुत बड़ा होने से घटाया)", " (reduced: too large)") : ""); } });

// ---- Crop / rotate / presets
const PRESETS = [["413x531", L("पासपोर्ट 35×45 मिमी (300 DPI)", "Passport 35×45 mm (300 DPI)")], ...TEMPLATES.filter((t) => t.unit === "px" && t.app === "photo").map((t) => [`${t.w}x${t.h}`, `${getLang() === "hi" ? t.hi : t.en} ${t.w}×${t.h}`]), ["custom", L("अपना साइज़", "Custom size")]];
export const crop = () => workbench({ init: { preset: "1080x1080", cw: 800, ch: 600, zoom: 1, ox: 0, oy: 0, rot: 0, flip: false, bg: "#ffffff" },
  help: L("सोशल मीडिया या फ़ॉर्म के सही साइज़ में क्रॉप कीजिए। ज़ूम और खिसकाव से सही हिस्सा चुनिए।", "Crop to exact social-media or form sizes. Zoom and shift to frame it."),
  controls: ({ p, rng, redraw, run }) => [field(L("साइज़", "Size"), sel(PRESETS, p.preset, (v) => { p.preset = v; redraw(); })), field(L("चौड़ाई (px) · अपना साइज़", "Width px · custom"), h("input", { type: "number", value: p.cw, min: 1, onchange: (e) => { p.cw = Math.max(1, +e.target.value || 1); redraw(); } })), field(L("ऊँचाई (px) · अपना साइज़", "Height px · custom"), h("input", { type: "number", value: p.ch, min: 1, onchange: (e) => { p.ch = Math.max(1, +e.target.value || 1); redraw(); } })),
    rng(L("ज़ूम", "Zoom"), "zoom", 1, 4, 0.05), rng(L("दाएँ-बाएँ", "Shift X"), "ox", -100, 100), rng(L("ऊपर-नीचे", "Shift Y"), "oy", -100, 100),
    field(L("घुमाएँ", "Rotate"), sel([[0, "0°"], [90, "90°"], [180, "180°"], [270, "270°"]], p.rot, (v) => { p.rot = +v; redraw(); })), h("label.chk", h("input", { type: "checkbox", onchange: (e) => { p.flip = e.target.checked; redraw(); } }), L("उलटा (मिरर)", "Mirror")), field(L("बैकग्राउंड रंग", "Background"), h("input", { type: "color", value: p.bg, oninput: (e) => { p.bg = e.target.value; redraw(); } }))],
  render: (src, p, cv, info) => {
    const [W, H] = p.preset === "custom" ? [p.cw, p.ch] : p.preset.split("x").map(Number), sw = p.rot % 180 ? src.height : src.width, sh = p.rot % 180 ? src.width : src.height;
    const t = document.createElement("canvas"); t.width = sw; t.height = sh; const tx = t.getContext("2d"); tx.translate(sw / 2, sh / 2); tx.rotate((p.rot * Math.PI) / 180); if (p.flip) tx.scale(-1, 1); tx.drawImage(src, -src.width / 2, -src.height / 2);
    cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.fillStyle = p.bg; x.fillRect(0, 0, W, H); const s = Math.max(W / sw, H / sh) * p.zoom, dw = sw * s, dh = sh * s;
    x.imageSmoothingQuality = "high"; x.drawImage(t, (W - dw) / 2 + (p.ox / 100) * Math.max(0, (dw - W) / 2), (H - dh) / 2 + (p.oy / 100) * Math.max(0, (dh - H) / 2), dw, dh); info.textContent = `${W}×${H}px`; } });

// ---- Background remover
let aiPipe = null;
async function aiRemove(src, info) {
  info.textContent = L("AI मॉडल डाउनलोड हो रहा है (पहली बार ~25 MB, इंटरनेट चाहिए)…", "Downloading AI model (first time ~25 MB, needs internet)…");
  if (!aiPipe) { const { pipeline } = await import("https://esm.sh/@huggingface/transformers@3"); aiPipe = await pipeline("background-removal", "Xenova/modnet", { dtype: "fp32" }); }
  info.textContent = L("AI काम कर रहा है…", "AI working…"); const out = await aiPipe(src.toDataURL("image/png")); const r = Array.isArray(out) ? out[0] : out;
  const c = document.createElement("canvas"); c.width = r.width; c.height = r.height; const id = new ImageData(r.width, r.height); const ch = r.channels || 4;
  for (let i = 0, n = r.width * r.height; i < n; i++) { id.data[i * 4] = r.data[i * ch]; id.data[i * 4 + 1] = r.data[i * ch + 1]; id.data[i * 4 + 2] = r.data[i * ch + 2]; id.data[i * 4 + 3] = ch === 4 ? r.data[i * 4 + 3] : 255; } c.getContext("2d").putImageData(id, 0, 0); info.textContent = ""; return c;
}
export const bgRemove = () => { let bgPick = null; return workbench({ onClick: ({ src, e, cv, redraw }) => { const r = cv.getBoundingClientRect(), x = Math.min(src.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * src.width))), y = Math.min(src.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * src.height))); bgPick = sampleColor(src.getContext("2d").getImageData(x, y, 1, 1), 1, 0, 0); redraw(); }, init: { mode: "plain", tolerance: 40, feather: 1, fill: "transparent", fillColor: "#ffffff" },
  help: L("सादे बैकग्राउंड (सफ़ेद/नीला/हरा) वाली फ़ोटो का बैकग्राउंड हटाइए। बैकग्राउंड का सही रंग चुनने के लिए फ़ोटो पर क्लिक कीजिए। AI मोड पोर्ट्रेट के लिए है (प्रायोगिक)।", "Remove plain backgrounds (white/blue/green). Click the photo to pick the background colour. AI mode is for portraits (experimental)."),
  controls: ({ p, rng, redraw }) => [field(L("तरीका", "Mode"), sel([["plain", L("सादा बैकग्राउंड (तेज़, ऑफ़लाइन)", "Plain background (fast, offline)")], ["ai", L("AI पोर्ट्रेट (प्रायोगिक, इंटरनेट)", "AI portrait (experimental, online)")]], p.mode, (v) => { p.mode = v; redraw(); })), rng(L("सहनशीलता", "Tolerance"), "tolerance", 5, 120), rng(L("किनारा मुलायम", "Edge softness"), "feather", 0, 4),
    field(L("पीछे क्या लगाएँ", "Fill behind"), sel([["transparent", L("पारदर्शी", "Transparent")], ["color", L("रंग", "Colour")]], p.fill, (v) => { p.fill = v; redraw(); })), field(L("रंग", "Colour"), h("input", { type: "color", value: p.fillColor, oninput: (e) => { p.fillColor = e.target.value; redraw(); } })),
    h("button.ghost", { onclick: () => { bgPick = null; redraw(); } }, L("बैकग्राउंड रंग ऑटो", "Auto background colour"))],
  render: async (src, p, cv, info) => {
    let res; if (p.mode === "ai") res = await aiRemove(src, info); else { res = document.createElement("canvas"); res.width = src.width; res.height = src.height; const x = res.getContext("2d"); x.drawImage(src, 0, 0); const d = x.getImageData(0, 0, res.width, res.height); removePlainBg(d, res.width, res.height, { tolerance: p.tolerance, feather: p.feather, bg: bgPick }); x.putImageData(d, 0, 0); }
    cv.width = res.width; cv.height = res.height; const x = cv.getContext("2d"); if (p.fill === "color") { x.fillStyle = p.fillColor; x.fillRect(0, 0, cv.width, cv.height); } x.drawImage(res, 0, 0); } });
};

// ---- Watermark
export const watermark = () => workbench({ init: { text: "© Tulika", size: 6, opacity: 50, pos: "br", color: "#ffffff", tile: false },
  help: L("फ़ोटो पर नाम/लोगो-टेक्स्ट लगाइए (हिंदी भी)। कोने में या पूरी फ़ोटो पर दोहराकर।", "Stamp your name / brand text (Hindi works) in a corner or tiled across the photo."),
  controls: ({ p, rng, redraw }) => [field(L("टेक्स्ट", "Text"), textIn(p.text, (v) => { p.text = v; redraw(); })), rng(L("साइज़ %", "Size %"), "size", 2, 30), rng(L("पारदर्शिता %", "Opacity %"), "opacity", 5, 100),
    field(L("जगह", "Position"), sel([["br", L("नीचे दाएँ", "Bottom right")], ["bl", L("नीचे बाएँ", "Bottom left")], ["tr", L("ऊपर दाएँ", "Top right")], ["tl", L("ऊपर बाएँ", "Top left")], ["c", L("बीच में", "Center")]], p.pos, (v) => { p.pos = v; redraw(); })), field(L("रंग", "Colour"), h("input", { type: "color", value: p.color, oninput: (e) => { p.color = e.target.value; redraw(); } })), h("label.chk", h("input", { type: "checkbox", onchange: (e) => { p.tile = e.target.checked; redraw(); } }), L("पूरी फ़ोटो पर दोहराएँ", "Tile across photo"))],
  render: (src, p, cv) => { cv.width = src.width; cv.height = src.height; const x = cv.getContext("2d"); x.drawImage(src, 0, 0); const fs = Math.max(10, (Math.min(src.width, src.height) * p.size) / 100); x.font = `700 ${fs}px "Noto Sans Devanagari", Inter, sans-serif`; x.fillStyle = p.color; x.globalAlpha = p.opacity / 100; x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = fs / 8; x.textBaseline = "middle";
    const tw = x.measureText(p.text).width, m = fs * 0.6;
    if (p.tile) { x.save(); x.translate(src.width / 2, src.height / 2); x.rotate(-Math.PI / 6); const gx = tw + fs * 2, gy = fs * 3, R = Math.hypot(src.width, src.height); for (let yy = -R; yy < R; yy += gy) for (let xx = -R; xx < R; xx += gx) x.fillText(p.text, xx, yy); x.restore(); }
    else { const px = p.pos.includes("l") ? m : p.pos.includes("r") ? src.width - tw - m : (src.width - tw) / 2, py = p.pos.includes("t") ? fs : p.pos === "c" ? src.height / 2 : src.height - fs; x.fillText(p.text, px, py); } } });

// ---- QR generator
export function qrTool() {
  let kind = "url", f = { url: "https://", pa: "", pn: "", am: "", tn: "", ssid: "", pw: "", enc: "WPA", wa: "", wm: "", txt: "" }, fg = "#000000", bg = "#ffffff", size = 512; const out = h("div.canvasbox"), msg = h("small"), fields = h("div.grid2");
  const build = () => ({ url: () => f.url, text: () => f.txt, upi: () => `upi://pay?pa=${f.pa}&pn=${encodeURIComponent(f.pn)}${f.am ? "&am=" + f.am : ""}&cu=INR${f.tn ? "&tn=" + encodeURIComponent(f.tn) : ""}`, wifi: () => `WIFI:T:${f.enc};S:${f.ssid};P:${f.pw};;`, wa: () => `https://wa.me/${f.wa.replace(/\D/g, "")}${f.wm ? "?text=" + encodeURIComponent(f.wm) : ""}` }[kind]());
  const draw = () => { out.textContent = ""; msg.textContent = ""; const t = build(); if (!t || t === "https://") return; try { const c = qrCanvas(t, { size, fg, bg }); c.className = "prev"; out.append(c); msg.textContent = `${new TextEncoder().encode(t).length}/${MAX_BYTES} bytes`; } catch { msg.textContent = L(`टेक्स्ट बहुत लंबा है (अधिकतम ${MAX_BYTES} बाइट)`, `Text too long (max ${MAX_BYTES} bytes)`); } };
  const inp = (label, key, o = {}) => field(label, textIn(f[key], (v) => { f[key] = v; draw(); }, o));
  const paint = () => { fields.textContent = ""; fields.append(...({ url: [inp("URL", "url")], text: [inp(L("टेक्स्ट", "Text"), "txt")], upi: [inp(L("UPI ID (जैसे name@bank)", "UPI ID (e.g. name@bank)"), "pa"), inp(L("नाम", "Payee name"), "pn"), inp(L("राशि ₹ (वैकल्पिक)", "Amount ₹ (optional)"), "am", { inputmode: "decimal" }), inp(L("नोट (वैकल्पिक)", "Note (optional)"), "tn")], wifi: [inp(L("वाई-फ़ाई नाम", "Network name"), "ssid"), inp(L("पासवर्ड", "Password"), "pw"), field(L("सुरक्षा", "Security"), sel([["WPA", "WPA/WPA2"], ["WEP", "WEP"], ["nopass", L("खुला", "Open")]], f.enc, (v) => { f.enc = v; draw(); }))], wa: [inp(L("WhatsApp नंबर (देश कोड के साथ, 91…)", "WhatsApp number (with country code, 91…)"), "wa", { inputmode: "tel" }), inp(L("पहले से लिखा संदेश (वैकल्पिक)", "Prefilled message (optional)"), "wm")] }[kind])); draw(); };
  const dl = (type) => { const t = build(); if (!t) return toast(L("पहले जानकारी भरिए", "Fill in the details first"), "err"); try { if (type === "svg") downloadBlob("qr.svg", new Blob([qrSvg(t, { fg, bg })], { type: "image/svg+xml" })); else qrCanvas(t, { size: Math.max(size, 1024), fg, bg }).toBlob((b) => downloadBlob("qr.png", b)); } catch { toast(L("टेक्स्ट बहुत लंबा", "Text too long"), "err"); } };
  paint();
  return h("div.form", note(L("URL, UPI भुगतान, वाई-फ़ाई या WhatsApp का QR। PNG (प्रिंट के लिए बड़ा) और SVG (वेक्टर, किसी भी साइज़)।", "QR for a link, UPI payment, Wi-Fi or WhatsApp. PNG (large) or SVG (vector, any size).")),
    field(L("किस चीज़ का QR", "QR type"), sel([["url", L("वेबसाइट लिंक", "Website link")], ["upi", "UPI"], ["wa", "WhatsApp"], ["wifi", "Wi-Fi"], ["text", L("सादा टेक्स्ट", "Plain text")]], kind, (v) => { kind = v; paint(); })), fields,
    h("div.grid2", field(L("QR का रंग", "QR colour"), h("input", { type: "color", value: fg, oninput: (e) => { fg = e.target.value; draw(); } })), field(L("बैकग्राउंड", "Background"), h("input", { type: "color", value: bg, oninput: (e) => { bg = e.target.value; draw(); } }))),
    h("div.btnrow", h("button.primary", { onclick: () => dl("png") }, icon("download", 16), "PNG"), h("button.primary", { onclick: () => dl("svg") }, icon("download", 16), "SVG")), msg, out);
}

// ---- Amount in words
export function wordsTool() {
  let v = ""; const en = h("textarea", { rows: 2, readonly: true }), hi = h("textarea", { rows: 2, readonly: true });
  const upd = () => { const r = rupeesInWords(v); en.value = r ? r.en : ""; hi.value = r ? r.hi : ""; };
  const cp = (el) => async () => { try { await navigator.clipboard.writeText(el.value); toast(L("कॉपी हो गया", "Copied")); } catch { el.select(); } };
  return h("div.form", note(L("चेक/बिल/इनवॉइस के लिए रकम शब्दों में (लाख-करोड़ वाली भारतीय गिनती)।", "Amount in words for cheques, bills and invoices (Indian lakh/crore system).")),
    field(L("रकम ₹", "Amount ₹"), h("input", { inputmode: "decimal", placeholder: "123456.50", oninput: (e) => { v = e.target.value; upd(); } })), field("हिंदी", hi), h("button.ghost", { onclick: cp(hi) }, icon("copy", 16), L("कॉपी", "Copy")), field("English", en), h("button.ghost", { onclick: cp(en) }, icon("copy", 16), L("कॉपी", "Copy")));
}

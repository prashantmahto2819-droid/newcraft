import { h, icon, toast, downloadBlob } from "../ui.js";
import { loadImg, jpegsToPdf, canvasJpeg } from "../tools/pdf.js";
import { makeZip } from "../tools/zip.js";
import { pickFile, pickFiles } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

const toBlob = (cv, type = "image/png", q = 0.92) => new Promise((r) => cv.toBlob(r, type, q));
const toU8 = async (b) => new Uint8Array(await b.arrayBuffer());
const sq = (img, size) => { const c = document.createElement("canvas"); c.width = c.height = size; const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2; x.drawImage(img, sx, sy, s, s, 0, 0, size, size); return c; };
const hex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// ---- colour palette from a photo
export function paletteOf(data, n = 6) { // data: RGBA Uint8ClampedArray -> [{hex, share}] by popularity, near colours merged
  const bins = new Map(); for (let i = 0; i < data.length; i += 4) { if (data[i + 3] < 128) continue; const k = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4), b = bins.get(k) || [0, 0, 0, 0]; b[0]++; b[1] += data[i]; b[2] += data[i + 1]; b[3] += data[i + 2]; bins.set(k, b); }
  const all = [...bins.values()].map(([c, r, g, b]) => ({ c, rgb: [r / c, g / c, b / c] })).sort((a, b) => b.c - a.c), out = [], total = all.reduce((s, a) => s + a.c, 0) || 1;
  for (const a of all) { const near = out.find((o) => Math.hypot(o.rgb[0] - a.rgb[0], o.rgb[1] - a.rgb[1], o.rgb[2] - a.rgb[2]) < 48); if (near) near.c += a.c; else if (out.length < n) out.push({ ...a }); else { /* absorb into nearest */ let best = out[0], bd = 1e9; for (const o of out) { const d = Math.hypot(o.rgb[0] - a.rgb[0], o.rgb[1] - a.rgb[1], o.rgb[2] - a.rgb[2]); if (d < bd) { bd = d; best = o; } } best.c += a.c; } }
  return out.sort((a, b) => b.c - a.c).map((o) => ({ hex: hex(...o.rgb.map(Math.round)), share: o.c / total }));
}
export function paletteTool() {
  const out = h("div.swatches"), info = h("small"); let cols = [];
  const run = async (f) => { const img = await loadImg(f), c = document.createElement("canvas"), s = Math.min(1, 120 / Math.max(img.width, img.height)); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height); cols = paletteOf(x.getImageData(0, 0, c.width, c.height).data, 6); out.textContent = ""; info.textContent = f.name;
    cols.forEach((k) => out.append(h("button.swatch", { style: { background: k.hex, color: "#fff", textShadow: "0 1px 3px #000a", minWidth: "96px", minHeight: "72px", border: "0", borderRadius: "12px", margin: "4px", font: "600 13px system-ui" }, onclick: async () => { try { await navigator.clipboard.writeText(k.hex); toast(k.hex + " " + L("कॉपी", "copied")); } catch {} } }, k.hex, h("br"), Math.round(k.share * 100) + "%"))); };
  return h("div.form", note(L("फ़ोटो से मुख्य रंग निकालिए (रंग पर क्लिक = HEX कॉपी)। ब्रांड/पोस्टर के रंग चुनने में काम आता है।", "Pull the main colours from a photo (click = copy HEX). Handy for brand/poster colours.")),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", run) }, icon("upload", 16), L("फ़ोटो चुनिए", "Choose photo")), h("button.ghost", { onclick: () => cols.length && downloadBlob("palette.css", new Blob([":root{\n" + cols.map((k, i) => `  --c${i + 1}: ${k.hex};`).join("\n") + "\n}\n"], { type: "text/css" })) }, icon("download", 16), "CSS"), info), out);
}

// ---- icon / favicon pack
export const makeIco = (pngs) => { // pngs: [{size, data:Uint8Array}] -> Uint8Array (PNG-in-ICO)
  const n = pngs.length, head = 6 + 16 * n, total = head + pngs.reduce((s, p) => s + p.data.length, 0), u = new Uint8Array(total), v = new DataView(u.buffer); v.setUint16(2, 1, true); v.setUint16(4, n, true); let off = head;
  pngs.forEach((p, i) => { const o = 6 + i * 16; u[o] = p.size >= 256 ? 0 : p.size; u[o + 1] = p.size >= 256 ? 0 : p.size; v.setUint16(o + 4, 1, true); v.setUint16(o + 6, 32, true); v.setUint32(o + 8, p.data.length, true); v.setUint32(o + 12, off, true); u.set(p.data, off); off += p.data.length; }); return u;
};
export function iconPackTool() {
  let img = null; const info = h("small"), prev = h("div.canvasbox");
  const go = h("button.primary", icon("download", 16), "ZIP");
  go.onclick = async () => { if (!img) return toast(L("पहले इमेज चुनिए", "Choose an image first"), "err"); go.disabled = true;
    try { const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512], files = []; const png = {}; for (const s of sizes) { png[s] = await toU8(await toBlob(sq(img, s))); files.push({ name: `icon-${s}.png`, data: png[s] }); }
      files.push({ name: "favicon.ico", data: makeIco([16, 32, 48].map((s) => ({ size: s, data: png[s] }))) }, { name: "apple-touch-icon.png", data: png[180] });
      files.push({ name: "manifest-snippet.json", data: new TextEncoder().encode(JSON.stringify({ icons: [{ src: "icon-192.png", sizes: "192x192", type: "image/png" }, { src: "icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 2)) });
      downloadBlob("icons.zip", makeZip(files)); } finally { go.disabled = false; } };
  return h("div.form", note(L("एक इमेज से वेबसाइट/ऐप के सारे आइकन: favicon.ico, 16–512 px PNG, Apple आइकन और manifest का टुकड़ा। इमेज बीच से चौकोर काटी जाती है।", "One image → all website/app icons: favicon.ico, 16–512 px PNGs, Apple icon and a manifest snippet. The image is centre-cropped to a square.")),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { img = await loadImg(f); info.textContent = f.name; prev.textContent = ""; const c = sq(img, 160); c.className = "prev"; prev.append(c); }) }, icon("upload", 16), L("इमेज चुनिए", "Choose image")), go, info), prev);
}

// ---- convert / strip metadata (re-encoding removes EXIF, GPS, camera info)
export function convertTool() {
  let files = [], fmt = "image/webp", q = 85, maxw = 0; const info = h("small");
  const go = h("button.primary", icon("download", 16), L("बदलिए", "Convert"));
  go.onclick = async () => { if (!files.length) return toast(L("पहले फ़ोटो चुनिए", "Choose photos first"), "err"); go.disabled = true;
    try { const ext = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" }[fmt], out = [];
      for (const f of files) { const img = await loadImg(f), s = maxw && img.width > maxw ? maxw / img.width : 1, c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); const x = c.getContext("2d"); if (fmt === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); } x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height); const b = await toBlob(c, fmt, q / 100); out.push({ name: f.name.replace(/\.[^.]+$/, "") + "." + ext, data: await toU8(b), blob: b }); }
      if (out.length === 1) downloadBlob(out[0].name, out[0].blob); else downloadBlob("converted.zip", makeZip(out)); toast(`${out.length} ${L("फ़ोटो तैयार", "photos ready")}`); } finally { go.disabled = false; } };
  return h("div.form", note(L("फ़ोटो को WebP / JPG / PNG में बदलिए। दोबारा सेव होने से EXIF, लोकेशन (GPS) और कैमरा की जानकारी हट जाती है, यानी शेयर करने से पहले प्राइवेसी साफ़।", "Convert photos to WebP / JPG / PNG. Re-saving removes EXIF, GPS location and camera info — handy before sharing.")),
    h("div.grid2", field(L("फ़ॉर्मेट", "Format"), sel([["image/webp", "WebP"], ["image/jpeg", "JPG"], ["image/png", "PNG"]], fmt, (v) => { fmt = v; })), field(L("क्वालिटी", "Quality"), h("input", { type: "range", min: 40, max: 100, value: q, oninput: (e) => { q = +e.target.value; } })),
      field(L("अधिकतम चौड़ाई (px, 0 = वही)", "Max width (px, 0 = same)"), textIn("0", (v) => { maxw = Math.max(0, parseInt(v) || 0); }, { inputmode: "numeric" }))),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFiles("image/*", (f) => { files = f; info.textContent = `${f.length} ${L("फ़ोटो", "photos")}`; }) }, icon("upload", 16), L("फ़ोटो चुनिए (कई)", "Choose photos (many)")), go, info));
}

// ---- photo collage
export function collageTool() {
  let imgs = [], cols = 2, gap = 12, bg = "#ffffff", size = 1080; const cv = document.createElement("canvas"); cv.className = "prev"; const out = h("div.canvasbox", cv), info = h("small");
  const draw = () => { if (!imgs.length) return; const rows = Math.ceil(imgs.length / cols), W = size, cw = (W - gap * (cols + 1)) / cols, H = Math.round(gap + rows * (cw + gap)); cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    imgs.forEach((im, i) => { const r = Math.floor(i / cols), c = i % cols, px = gap + c * (cw + gap), py = gap + r * (cw + gap), s = Math.max(cw / im.width, cw / im.height); x.save(); x.beginPath(); x.rect(px, py, cw, cw); x.clip(); x.imageSmoothingQuality = "high"; x.drawImage(im, px + (cw - im.width * s) / 2, py + (cw - im.height * s) / 2, im.width * s, im.height * s); x.restore(); }); };
  return h("div.form", note(L("2 से 9 फ़ोटो का कोलाज (WhatsApp/Instagram के लिए)।", "A collage of 2–9 photos (for WhatsApp/Instagram).")),
    h("div.grid2", field(L("कॉलम", "Columns"), sel([["1", "1"], ["2", "2"], ["3", "3"]], String(cols), (v) => { cols = +v; draw(); })), field(L("गैप", "Gap"), h("input", { type: "range", min: 0, max: 40, value: gap, oninput: (e) => { gap = +e.target.value; draw(); } })), field(L("बैकग्राउंड", "Background"), h("input", { type: "color", value: bg, oninput: (e) => { bg = e.target.value; draw(); } }))),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFiles("image/*", async (f) => { imgs = await Promise.all(f.slice(0, 9).map(loadImg)); info.textContent = `${imgs.length}`; draw(); }) }, icon("upload", 16), L("फ़ोटो चुनिए", "Choose photos")), h("button.primary", { onclick: async () => { if (!imgs.length) return toast(L("पहले फ़ोटो चुनिए", "Choose photos first"), "err"); downloadBlob("collage.png", await toBlob(cv)); } }, icon("download", 16), "PNG"), info), out);
}

// ---- resume / biodata (A4 PDF, Hindi OK)
const FONT = '"Noto Sans Devanagari", Inter, system-ui, sans-serif';
function wrapText(x, text, maxW) { const out = []; for (const para of String(text).split("\n")) { let line = ""; for (const w of para.split(/\s+/)) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
export function drawResume(cv, d, photo) {
  const W = 2480, H = 3508, m = 170; cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.fillStyle = d.accent; x.fillRect(0, 0, W, 360);
  let tx = m; if (photo) { const r = 120, cx = W - m - r, cy = 180; x.save(); x.beginPath(); x.arc(cx, cy, r, 0, 7); x.clip(); const s = Math.max((2 * r) / photo.width, (2 * r) / photo.height); x.drawImage(photo, cx - (photo.width * s) / 2, cy - (photo.height * s) / 2, photo.width * s, photo.height * s); x.restore(); }
  x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; x.font = `800 110px ${FONT}`; x.fillText(d.name || "—", tx, 170); x.font = `500 52px ${FONT}`; x.fillText(d.title, tx, 250); x.font = `400 40px ${FONT}`; x.fillText([d.phone, d.email, d.address].filter(Boolean).join("   •   "), tx, 320, W - 2 * m - (photo ? 300 : 0));
  let y = 470; const sect = (title, body, bullets) => { if (!body || !String(body).trim()) return; x.fillStyle = d.accent; x.font = `700 58px ${FONT}`; x.fillText(title, m, y); x.fillRect(m, y + 18, W - 2 * m, 5); y += 90; x.fillStyle = "#1f2937"; x.font = `400 46px ${FONT}`;
    for (const raw of String(body).split("\n").filter((l) => l.trim())) { const lines = wrapText(x, (bullets ? "•  " : "") + raw.trim(), W - 2 * m); for (const l of lines) { x.fillText(l, m + (bullets && !l.startsWith("•") ? 40 : 0), y); y += 68; } y += bullets ? 10 : 0; } y += 50; };
  sect(d.l.summary, d.summary, false); sect(d.l.exp, d.exp, true); sect(d.l.edu, d.edu, true); sect(d.l.skills, d.skills, false); sect(d.l.extra, d.extra, true);
  return y;
}
export function resumeTool() {
  const d = { name: "", title: "", phone: "", email: "", address: "", summary: "", exp: "", edu: "", skills: "", extra: "", accent: "#0f766e", l: {} }; let photo = null, lang = "hi"; const cv = document.createElement("canvas"); cv.className = "prev"; const out = h("div.canvasbox", cv);
  const LBL = { hi: { summary: "परिचय", exp: "अनुभव", edu: "शिक्षा", skills: "कौशल", extra: "अन्य जानकारी" }, en: { summary: "Profile", exp: "Experience", edu: "Education", skills: "Skills", extra: "Additional" } };
  const draw = async () => { d.l = LBL[lang]; try { await document.fonts.load(`700 40px "Noto Sans Devanagari"`); await document.fonts.load("700 40px Inter"); } catch {} const prev = document.createElement("canvas"); drawResume(prev, d, photo); cv.width = 620; cv.height = 877; cv.getContext("2d").drawImage(prev, 0, 0, 620, 877); };
  const t = (k, label, area) => field(label, area ? h("textarea", { rows: 3, oninput: (e) => { d[k] = e.target.value; draw(); } }) : textIn(d[k], (v) => { d[k] = v; draw(); }));
  draw();
  return h("div.form", note(L("बायोडाटा / रिज़्यूमे बनाइए (हिंदी या English) और A4 PDF डाउनलोड कीजिए। हर लाइन = एक बुलेट।", "Make a resume/biodata (Hindi or English) and download an A4 PDF. One line = one bullet.")),
    h("div.grid2", t("name", L("नाम", "Name")), t("title", L("पद / पेशा", "Title")), t("phone", L("फ़ोन", "Phone")), t("email", "Email"), t("address", L("पता", "Address")), field(L("भाषा के शीर्षक", "Headings"), sel([["hi", "हिंदी"], ["en", "English"]], lang, (v) => { lang = v; draw(); })), field(L("रंग", "Colour"), h("input", { type: "color", value: d.accent, oninput: (e) => { d.accent = e.target.value; draw(); } }))),
    t("summary", L("परिचय", "Profile"), true), t("exp", L("अनुभव (हर लाइन एक)", "Experience"), true), t("edu", L("शिक्षा", "Education"), true), t("skills", L("कौशल", "Skills"), true), t("extra", L("अन्य (भाषाएँ, शौक़…)", "Additional"), true),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { photo = await loadImg(f); draw(); }) }, icon("image", 16), L("फ़ोटो (गोल)", "Photo (round)")),
      h("button.primary", { onclick: async () => { await draw(); const full = document.createElement("canvas"); drawResume(full, d, photo); downloadBlob("resume.pdf", new Blob([jpegsToPdf([{ jpeg: await canvasJpeg(full, 0.92), w: full.width, h: full.height, pw: 595.28, ph: 841.89, x: 0, y: 0, iw: 595.28, ih: 841.89 }])], { type: "application/pdf" })); } }, icon("download", 16), "PDF")), out);
}

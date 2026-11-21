import { h, icon, toast, downloadBlob } from "../ui.js";
import { loadImg, jpegsToPdf, canvasJpeg } from "../tools/pdf.js";
import { loadFontCss, fontWeight, fontOptions } from "../data/fonts_all.js";
import { pickFile } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

const jpegBlob = (cv, q) => new Promise((r) => cv.toBlob(r, "image/jpeg", q));
// Smallest-effort search: highest JPEG quality whose size is <= maxKB; if even q=0.1 is too big, shrink the canvas.
export async function fitToKB(cv, maxKB) {
  let c = cv;
  for (let step = 0; step < 6; step++) {
    let lo = 0.1, hi = 0.95, best = null;
    for (let i = 0; i < 9; i++) { const q = (lo + hi) / 2, b = await jpegBlob(c, q); if (b.size <= maxKB * 1024) { best = b; lo = q; } else hi = q; }
    if (best) return best;
    const n = document.createElement("canvas"); n.width = Math.max(16, Math.round(c.width * 0.85)); n.height = Math.max(16, Math.round(c.height * 0.85)); n.getContext("2d").drawImage(c, 0, 0, n.width, n.height); c = n;
  }
  return jpegBlob(c, 0.1);
}
const PRESETS = { photo: [200, 230, 50], sign: [140, 60, 20], id: [300, 400, 100], custom: [400, 500, 100] };
export function formPhotoTool() {
  let img = null, kind = "photo", w = 200, h_ = 230, kb = 50, zoom = 1, ox = 0, oy = 0, bg = "#ffffff", fit = "cover"; const info = h("small"), prev = h("div.canvasbox"), stat = h("small");
  const cv = () => { const c = document.createElement("canvas"); c.width = w; c.height = h_; const x = c.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, w, h_); if (img) { const s = (fit === "cover" ? Math.max(w / img.width, h_ / img.height) : Math.min(w / img.width, h_ / img.height)) * zoom; x.imageSmoothingQuality = "high"; x.drawImage(img, (w - img.width * s) / 2 + ox * w, (h_ - img.height * s) / 2 + oy * h_, img.width * s, img.height * s); } return c; };
  const draw = async () => { prev.textContent = ""; const c = cv(); c.className = "prev"; c.style.maxWidth = "260px"; prev.append(c); if (img) { const b = await fitToKB(c, kb); stat.textContent = `${w}×${h_} px · ${(b.size / 1024).toFixed(1)} KB`; } };
  const num = (get, set, label) => field(label, textIn(String(get()), (v) => { set(Math.max(16, parseInt(v) || 16)); draw(); }, { inputmode: "numeric" }));
  const rng = (label, min, max, step, get, set) => field(label, h("input", { type: "range", min, max, step, value: get(), oninput: (e) => { set(+e.target.value); draw(); } }));
  const go = h("button.primary", icon("download", 16), "JPG");
  go.onclick = async () => { if (!img) return toast(L("पहले फ़ोटो चुनिए", "Choose a photo first"), "err"); const b = await fitToKB(cv(), kb); downloadBlob(`${kind}-${w}x${h_}.jpg`, b); };
  draw();
  return h("div.form", note(L("सरकारी फ़ॉर्म / परीक्षा के लिए फ़ोटो और हस्ताक्षर को तय साइज़ (px) और अधिकतम KB में बदलिए। नीचे के आँकड़े सिर्फ़ सामान्य शुरुआती मान हैं: अपने फ़ॉर्म की शर्तें देखकर बदलिए।", "Resize a photo or signature to an exact size (px) and maximum KB for forms and exams. The values are only common starting points: change them to your form's rules.")),
    h("div.grid2", field(L("प्रकार", "Type"), sel([["photo", L("फ़ोटो", "Photo")], ["sign", L("हस्ताक्षर", "Signature")], ["id", L("बड़ी ID फ़ोटो", "Large ID photo")], ["custom", L("अपना साइज़", "Custom")]], kind, (v) => { kind = v; [w, h_, kb] = PRESETS[v]; zoom = 1; ox = oy = 0; draw(); go.focus; })),
      num(() => w, (v) => { w = v; }, L("चौड़ाई px", "Width px")), num(() => h_, (v) => { h_ = v; }, L("ऊँचाई px", "Height px")), num(() => kb, (v) => { kb = v; }, L("अधिकतम KB", "Max KB")),
      field(L("तरीक़ा", "Fit"), sel([["cover", L("भरें (कट सकता है)", "Fill (may crop)")], ["contain", L("पूरा दिखाएँ", "Show whole")]], fit, (v) => { fit = v; draw(); })), field(L("बैकग्राउंड", "Background"), h("input", { type: "color", value: bg, oninput: (e) => { bg = e.target.value; draw(); } })),
      rng(L("ज़ूम", "Zoom"), 0.5, 3, 0.05, () => zoom, (v) => { zoom = v; }), rng(L("बाएँ-दाएँ", "Left-right"), -0.5, 0.5, 0.01, () => ox, (v) => { ox = v; }), rng(L("ऊपर-नीचे", "Up-down"), -0.5, 0.5, 0.01, () => oy, (v) => { oy = v; })),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { img = await loadImg(f); info.textContent = f.name; draw(); }) }, icon("upload", 16), L("फ़ोटो चुनिए", "Choose photo")), go, info, stat), prev);
}

// ---- certificate maker (A4 landscape PDF/PNG)
const THEMES = { gold: ["#fffaf0", "#b45309", "#7c2d12"], blue: ["#f8fafc", "#1d4ed8", "#1e3a8a"], green: ["#f7fee7", "#15803d", "#14532d"], maroon: ["#fff7ed", "#9f1239", "#4c0519"] };
const loadDeco = loadFontCss;
function wrapLines(x, text, maxW) { const out = []; for (const para of String(text).split("\n")) { let line = ""; for (const w of para.split(/\s+/)) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
export function drawCertificate(cv, d, logo) {
  const W = 3508, H = 2480, [bg, c1, c2] = THEMES[d.theme]; cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = c1; x.lineWidth = 26; x.strokeRect(90, 90, W - 180, H - 180); x.lineWidth = 6; x.strokeRect(150, 150, W - 300, H - 300); x.fillStyle = c1;
  for (const [a, b] of [[90, 90], [W - 90, 90], [90, H - 90], [W - 90, H - 90]]) { x.beginPath(); x.arc(a, b, 60, 0, 7); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(a, b, 30, 0, 7); x.fill(); x.fillStyle = c1; }
  x.textAlign = "center"; x.textBaseline = "alphabetic"; const F = (px, wt, fam) => (x.font = `${wt} ${px}px "${fam}", "Noto Sans Devanagari", Inter, sans-serif`);
  let y = 470; if (logo) { const r = Math.min(260 / logo.width, 260 / logo.height); x.drawImage(logo, W / 2 - (logo.width * r) / 2, 230, logo.width * r, logo.height * r); y = 600; }
  x.fillStyle = c2; F(d.org ? 70 : 10, 600, "Noto Sans Devanagari"); if (d.org) { x.fillText(d.org, W / 2, y - 90); }
  x.fillStyle = c1; F(250, 700, d.font); x.fillText(d.title, W / 2, y + 150, W - 500);
  x.fillStyle = "#374151"; F(76, 400, "Noto Sans Devanagari"); x.fillText(d.lead, W / 2, y + 360);
  x.fillStyle = c2; F(220, 700, d.font); x.fillText(d.name || "—", W / 2, y + 640, W - 600); x.fillRect(W / 2 - 800, y + 690, 1600, 6);
  x.fillStyle = "#1f2937"; F(74, 400, "Noto Sans Devanagari"); const lines = wrapLines(x, d.body, W - 900); lines.slice(0, 4).forEach((l, i) => x.fillText(l, W / 2, y + 860 + i * 112));
  x.fillStyle = "#374151"; F(60, 500, "Noto Sans Devanagari"); x.textAlign = "left"; x.fillText(d.date ? "दिनांक: " + d.date : "", 360, H - 380); x.textAlign = "center";
  const sig = (cx, name, role) => { if (!name && !role) return; x.fillStyle = "#111"; x.fillRect(cx - 360, H - 450, 720, 4); F(60, 700, "Noto Sans Devanagari"); x.fillText(name, cx, H - 370); F(50, 400, "Noto Sans Devanagari"); x.fillStyle = "#4b5563"; x.fillText(role, cx, H - 305); };
  sig(W - 760, d.s1, d.r1); sig(W / 2, d.s2, d.r2);
}
export function certificateTool() {
  const d = { theme: "gold", title: "प्रमाण पत्र", lead: "यह प्रमाणित किया जाता है कि", name: "", body: "ने उत्कृष्ट प्रदर्शन एवं सराहनीय योगदान दिया है। हम उनके उज्ज्वल भविष्य की कामना करते हैं।", date: "", org: "", s1: "", r1: "अध्यक्ष", s2: "", r2: "सचिव", font: "Yatra One" }; let logo = null; const cv = document.createElement("canvas"); cv.className = "prev"; const out = h("div.canvasbox", cv);
  const draw = async () => { await loadDeco(); try { await document.fonts.load(`700 40px "${d.font}"`); await document.fonts.load('700 40px "Noto Sans Devanagari"'); } catch {} const big = document.createElement("canvas"); drawCertificate(big, d, logo); cv.width = 800; cv.height = 566; cv.getContext("2d").drawImage(big, 0, 0, 800, 566); };
  const t = (k, label, area) => field(label, area ? h("textarea", { rows: 3, value: d[k], oninput: (e) => { d[k] = e.target.value; draw(); } }) : textIn(d[k], (v) => { d[k] = v; draw(); }));
  draw();
  const full = async () => { await draw(); const c = document.createElement("canvas"); drawCertificate(c, d, logo); return c; };
  return h("div.form", note(L("सम्मान / भागीदारी / उपलब्धि प्रमाण पत्र बनाइए: सजावटी हिंदी फ़ॉन्ट और रंगीन बॉर्डर के साथ, A4 आड़ा (landscape) PDF या PNG।", "Make appreciation / participation / achievement certificates with decorative Hindi fonts and borders, A4 landscape PDF or PNG.")),
    h("div.grid2", t("title", L("शीर्षक", "Title")), t("name", L("नाम", "Name")), t("lead", L("शुरुआती पंक्ति", "Lead line")), t("org", L("संस्था का नाम", "Organisation")), t("date", L("दिनांक", "Date")),
      field(L("रंग-थीम", "Theme"), sel([["gold", L("सुनहरा", "Gold")], ["blue", L("नीला", "Blue")], ["green", L("हरा", "Green")], ["maroon", L("मैरून", "Maroon")]], d.theme, (v) => { d.theme = v; draw(); })), field(L("शीर्षक का फ़ॉन्ट", "Title font"), sel(fontOptions(), d.font, (v) => { d.font = v; draw(); })),
      t("s1", L("हस्ताक्षर 1 का नाम", "Signer 1")), t("r1", L("पद 1", "Role 1")), t("s2", L("हस्ताक्षर 2 का नाम", "Signer 2")), t("r2", L("पद 2", "Role 2"))), t("body", L("मुख्य पंक्तियाँ", "Body text"), true),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { logo = await loadImg(f); draw(); }) }, icon("image", 16), L("लोगो", "Logo")),
      h("button.primary", { onclick: async () => { const c = await full(); downloadBlob("certificate.pdf", new Blob([jpegsToPdf([{ jpeg: await canvasJpeg(c, 0.93), w: c.width, h: c.height, pw: 841.89, ph: 595.28, x: 0, y: 0, iw: 841.89, ih: 595.28 }])], { type: "application/pdf" })); } }, icon("download", 16), "PDF"),
      h("button.primary", { onclick: async () => { const c = await full(); c.toBlob((b) => downloadBlob("certificate.png", b)); } }, icon("download", 16), "PNG")), out);
}

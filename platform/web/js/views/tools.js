import { h, icon, toast, downloadBlob } from "../ui.js";
import { getLang, bytes } from "../i18n.js";
import { krutiToUnicode } from "../tools/kruti.js";
import { jpegsToPdf, canvasJpeg, loadImg } from "../tools/pdf.js";
import { pickFile } from "./shared.js";
import { enhance, upscale, crop, bgRemove, watermark, qrTool, wordsTool } from "./tools_img.js";
import { pdfMerge, pdfOrganize, pdfCompress, pdfToImages, loadLib, readBuf } from "./tools_pdf.js";
import { barcodeTool, cardTool } from "./tools_card.js";
import { invoiceTool, pdfStamp } from "./tools_biz.js";
import { ocrTool } from "./tools_ocr.js";
import { romanToDevanagari } from "../tools/translit.js";
import { greetingTool } from "./tools_greet.js";
import { aiTool } from "./tools_ai.js";
import { paletteTool, iconPackTool, convertTool, collageTool, resumeTool, scanTool } from "./tools_more.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);
const MM = 25.4;
const field = (label, el) => h("label.fld", h("span", label), el);
const num = (v, o = {}) => h("input", { type: "number", value: v, min: 1, step: "any", ...o });
const sel = (opts, v, onchange) => h("select", { onchange: (e) => onchange?.(e.target.value) }, opts.map(([k, l]) => h("option", { value: k, selected: k === String(v) }, l)));
const note = (t) => h("p.sub", t);
const multi = (accept, cb) => { const i = h("input", { type: "file", accept, multiple: true, style: { display: "none" }, onchange: () => cb([...i.files]) }); document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000); };

// ---------- 1. Kruti Dev -> Unicode ----------
function kruti() {
  const a = h("textarea", { rows: 6, placeholder: "fgUnh Hkkjr dk;kZy;…", "aria-label": "Kruti Dev" }), b = h("textarea", { rows: 6, readonly: true, "aria-label": "Unicode" });
  a.oninput = () => (b.value = krutiToUnicode(a.value));
  return h("div.form", note(L("Kruti Dev 010 में टाइप किया पुराना टेक्स्ट यहाँ चिपकाइए, यूनिकोड हिंदी मिलेगी। (बीटा: कठिन संयुक्ताक्षर जाँच लीजिए।)", "Paste old Kruti Dev 010 text and get Unicode Hindi. (Beta: check complex conjuncts.)")),
    field("Kruti Dev", a), field("Unicode", b),
    h("div.btnrow", h("button.primary", { onclick: async () => { try { await navigator.clipboard.writeText(b.value); toast(L("कॉपी हो गया", "Copied")); } catch { b.select(); } } }, icon("copy", 16), L("कॉपी", "Copy")),
      h("button.ghost", { onclick: () => downloadBlob("unicode.txt", new Blob([b.value], { type: "text/plain;charset=utf-8" })) }, icon("download", 16), ".txt")));
}

// ---------- 2. Passport / ID photo sheet ----------
const PH = [["35x45", L("पासपोर्ट 35×45 मिमी", "Passport 35×45 mm")], ["51x51", L("वीज़ा 2×2 इंच", "Visa 2×2 in")], ["25x35", L("स्टैम्प 25×35 मिमी", "Small 25×35 mm")]];
const SH = [["102x152", L("4×6 इंच फ़ोटो पेपर", "4×6 in photo paper")], ["210x297", "A4"]];
function passport() {
  let img = null, ps = "35x45", sh = "102x152", gap = 2, cnt = 0, border = true;
  const cv = h("canvas.prev"), info = h("small");
  const draw = () => {
    if (!img) return; const dpi = 300, px = (mm) => Math.round((mm / MM) * dpi);
    const [pw, ph] = ps.split("x").map(Number), [sw, shh] = sh.split("x").map(Number);
    const W = px(sw), H = px(shh), w = px(pw), hh = px(ph), g = px(gap), m = px(5);
    const cols = Math.max(1, Math.floor((W - 2 * m + g) / (w + g))), rows = Math.max(1, Math.floor((H - 2 * m + g) / (hh + g))), max = cols * rows, n = cnt ? Math.min(cnt, max) : max;
    cv.width = W; cv.height = H; const x = cv.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    const r = w / hh, sr = img.width / img.height; let sx = 0, sy = 0, sW = img.width, sH = img.height; if (sr > r) { sW = img.height * r; sx = (img.width - sW) / 2; } else { sH = img.width / r; sy = (img.height - sH) / 2; }
    const gw = cols * w + (cols - 1) * g, ox = Math.round((W - gw) / 2);
    for (let i = 0; i < n; i++) { const cx = ox + (i % cols) * (w + g), cy = m + Math.floor(i / cols) * (hh + g); x.drawImage(img, sx, sy, sW, sH, cx, cy, w, hh); if (border) { x.strokeStyle = "#999"; x.lineWidth = 2; x.strokeRect(cx, cy, w, hh); } }
    info.textContent = `${n} / ${max} · ${W}×${H}px (300 DPI)`;
  };
  const pick = () => pickFile("image/*", async (f) => { img = await loadImg(f); draw(); });
  const png = () => cv.toBlob((b) => b && downloadBlob("photo-sheet.png", b), "image/png");
  const pdf = async () => { const [sw, shh] = sh.split("x").map(Number); const jpeg = await canvasJpeg(cv, 0.95); downloadBlob("photo-sheet.pdf", jpegsToPdf([{ jpeg, w: cv.width, h: cv.height, pw: (sw / MM) * 72, ph: (shh / MM) * 72, x: 0, y: 0, iw: (sw / MM) * 72, ih: (shh / MM) * 72 }])); };
  const need = (fn) => () => (img ? fn() : toast(L("पहले फ़ोटो चुनिए", "Choose a photo first"), "err"));
  return h("div.form", note(L("एक फ़ोटो से पूरी शीट: 300 DPI, कटिंग लाइन के साथ। फ़ोटो आपके ब्राउज़र से बाहर नहीं जाती।", "One photo → full print sheet at 300 DPI with cut lines. The photo never leaves your browser.")),
    h("div.grid2", field(L("फ़ोटो का साइज़", "Photo size"), sel(PH, ps, (v) => { ps = v; draw(); })), field(L("शीट", "Sheet"), sel(SH, sh, (v) => { sh = v; draw(); })),
      field(L("गैप (मिमी)", "Gap (mm)"), num(gap, { min: 0, onchange: (e) => { gap = Math.max(0, +e.target.value || 0); draw(); } })), field(L("कितनी कॉपी (0 = पूरी शीट)", "Copies (0 = fill sheet)"), num(0, { min: 0, onchange: (e) => { cnt = Math.max(0, +e.target.value || 0); draw(); } }))),
    h("label.chk", h("input", { type: "checkbox", checked: true, onchange: (e) => { border = e.target.checked; draw(); } }), L("कटिंग बॉर्डर", "Cut border")),
    h("div.btnrow", h("button.ghost", { onclick: pick }, icon("image", 16), L("फ़ोटो चुनिए", "Choose photo")), h("button.primary", { onclick: need(png) }, icon("download", 16), "PNG"), h("button.primary", { onclick: need(pdf) }, icon("download", 16), "PDF")), info, h("div.canvasbox", cv));
}

// ---------- 3. Compress / convert (with target file size) ----------
const toBlob = (c, fmt, q) => new Promise((r) => c.toBlob(r, fmt, q));
export async function encodeToTarget(c, fmt, targetKB) {
  if (!targetKB || fmt === "image/png") return toBlob(c, fmt, 0.8);
  const max = targetKB * 1024; let cur = c, scale = 1;
  for (let step = 0; step < 12; step++) {
    let lo = 0.05, hi = 0.95, best = null;
    for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2, b = await toBlob(cur, fmt, mid); if (b.size <= max) { best = b; lo = mid; } else hi = mid; }
    if (best) return best;
    scale *= 0.85; const n = document.createElement("canvas"); n.width = Math.max(8, Math.round(c.width * scale)); n.height = Math.max(8, Math.round(c.height * scale)); n.getContext("2d").drawImage(c, 0, 0, n.width, n.height); cur = n;
  }
  return toBlob(cur, fmt, 0.05);
}
function imageTool() {
  let fmt = "image/jpeg", q = 80, maxW = 1600, kb = 0, list = []; const out = h("div.rows");
  const draw = () => { out.textContent = ""; list.forEach((r) => out.append(h("div.row", h("div.grow", h("b", r.name), h("small", `${bytes(r.before)} → ${bytes(r.blob.size)} · ${r.w}×${r.h}`)), h("button.ghost", { onclick: () => downloadBlob(r.name, r.blob) }, icon("download", 16))))); };
  const run = async (files) => {
    list = []; const f2 = kb && fmt === "image/png" ? "image/jpeg" : fmt;
    for (const f of files) {
      const im = await loadImg(f), s = Math.min(1, maxW / im.width), w = Math.round(im.width * s), hh = Math.round(im.height * s);
      const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d"); if (f2 !== "image/png") { x.fillStyle = "#fff"; x.fillRect(0, 0, w, hh); } x.drawImage(im, 0, 0, w, hh);
      const blob = kb ? await encodeToTarget(c, f2, kb) : await toBlob(c, f2, q / 100); const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[f2];
      list.push({ name: f.name.replace(/\.[^.]+$/, "") + "-tulika." + ext, blob, before: f.size, w, h: hh }); URL.revokeObjectURL(im.src);
    } draw();
  };
  return h("div.form", note(L("एक साथ कई फ़ोटो छोटी करें, साइज़ घटाएँ या JPG/PNG/WebP में बदलें। सरकारी फ़ॉर्म के लिए 'KB से कम' भी तय कर सकते हैं।", "Shrink, resize or convert many photos at once. For government forms you can also set a 'max KB' target.")),
    h("div.grid2", field(L("फ़ॉर्मैट", "Format"), sel([["image/jpeg", "JPG"], ["image/png", "PNG"], ["image/webp", "WebP"]], fmt, (v) => (fmt = v))), field(L("अधिकतम चौड़ाई (px)", "Max width (px)"), num(maxW, { onchange: (e) => (maxW = Math.max(16, +e.target.value || 1600)) })),
      field(L("क्वालिटी %", "Quality %"), num(q, { min: 1, max: 100, onchange: (e) => (q = Math.min(100, Math.max(1, +e.target.value || 80))) })), field(L("KB से कम (0 = बंद)", "Under KB (0 = off)"), num(kb, { min: 0, onchange: (e) => (kb = Math.max(0, +e.target.value || 0)) }))),
    h("button.primary", { onclick: () => multi("image/*", (f) => f.length && run(f)) }, icon("upload", 16), L("फ़ोटो चुनिए और बदलिए", "Choose photos & convert")), out);
}

// ---------- 4. Images -> PDF ----------
function imgPdf() {
  let files = [], page = "a4", margin = 10; const lst = h("div.rows");
  const draw = () => { lst.textContent = ""; files.forEach((f, i) => lst.append(h("div.row", h("div.grow", h("b", f.name), h("small", bytes(f.size))), h("button.icon-btn", { "aria-label": "up", disabled: !i, onclick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); } }, "↑"), h("button.icon-btn", { "aria-label": "remove", onclick: () => { files.splice(i, 1); draw(); } }, icon("x", 16))))); };
  const make = async () => {
    if (!files.length) return toast(L("पहले फ़ोटो जोड़िए", "Add images first"), "err");
    const pages = [], pt = (mm) => (mm / MM) * 72;
    for (const f of files) {
      const im = await loadImg(f), c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0);
      const jpeg = await canvasJpeg(c, 0.9); let pw = pt(210), ph = pt(297); const m = pt(margin);
      if (page === "fit") { pw = im.width * 0.75 + 2 * m; ph = im.height * 0.75 + 2 * m; } else if (im.width > im.height) [pw, ph] = [ph, pw];
      const s = Math.min((pw - 2 * m) / im.width, (ph - 2 * m) / im.height), iw = im.width * s, ih = im.height * s;
      pages.push({ jpeg, w: im.width, h: im.height, pw, ph, x: (pw - iw) / 2, y: (ph - ih) / 2, iw, ih }); URL.revokeObjectURL(im.src);
    }
    downloadBlob("images.pdf", jpegsToPdf(pages)); toast(L("PDF बन गई", "PDF ready"));
  };
  return h("div.form", note(L("कई फ़ोटो से एक PDF बनाइए। क्रम ऊपर-नीचे बदल सकते हैं।", "Combine photos into one PDF. Reorder with the arrows.")),
    h("div.grid2", field(L("पेज", "Page"), sel([["a4", "A4"], ["fit", L("फ़ोटो के साइज़ का", "Fit to image")]], page, (v) => (page = v))), field(L("मार्जिन (मिमी)", "Margin (mm)"), num(margin, { min: 0, onchange: (e) => (margin = Math.max(0, +e.target.value || 0)) }))),
    h("div.btnrow", h("button.ghost", { onclick: () => multi("image/*", (f) => { files.push(...f); draw(); }) }, icon("plus", 16), L("फ़ोटो जोड़िए", "Add images")), h("button.primary", { onclick: make }, icon("download", 16), "PDF")), lst);
}

// ---------- 5. Print size calculator ----------
function sizeCalc() {
  const U = { mm: 1, cm: 10, in: MM, ft: 12 * MM }; let w = 6, hh = 3, u = "ft", dpi = 72; const res = h("div.rows");
  const draw = () => { res.textContent = ""; const mw = w * U[u], mh = hh * U[u];
    for (const k of ["mm", "cm", "in", "ft"]) res.append(h("div.row", h("b.grow", k), h("span", `${(mw / U[k]).toFixed(2)} × ${(mh / U[k]).toFixed(2)}`)));
    for (const d of [72, 100, 150, 300]) { const pw = Math.round((mw / MM) * d), ph = Math.round((mh / MM) * d), mp = (pw * ph) / 1e6; res.append(h("div.row", h("b.grow", `${d} DPI`), h("span", `${pw} × ${ph} px · ${mp.toFixed(1)} MP${mp > 100 ? " ⚠" : ""}`))); } };
  const fix = () => { dpi; draw(); };
  return h("div.form", note(L("फ्लेक्स/पोस्टर का असली साइज़ डालिए, हर यूनिट और अलग-अलग DPI पर पिक्सल दिखेंगे। बड़े फ्लेक्स के लिए आमतौर पर 72–100 DPI काफ़ी होता है।", "Enter the real print size to see every unit and the pixels at several DPI. Large flex banners usually need only 72–100 DPI.")),
    h("div.grid2", field(L("चौड़ाई", "Width"), num(w, { oninput: (e) => { w = +e.target.value || 0; fix(); } })), field(L("ऊँचाई", "Height"), num(hh, { oninput: (e) => { hh = +e.target.value || 0; fix(); } })), field(L("यूनिट", "Unit"), sel(Object.keys(U).map((k) => [k, k]), u, (v) => { u = v; fix(); }))), (draw(), res));
}

const TOOLS = [
  { id: "bg", cat: "photo", icon: "wand", c: "#ec4899", hi: "बैकग्राउंड हटाएँ", en: "Background remover", dh: "सादा बैकग्राउंड: ऑफ़लाइन। पोर्ट्रेट: AI (प्रायोगिक)", de: "Plain bg offline; portrait AI (experimental)", beta: true, view: bgRemove },
  { id: "enhance", cat: "photo", icon: "wand", c: "#f59e0b", hi: "फ़ोटो एन्हांसर", en: "Photo enhancer", dh: "ऑटो-लेवल, रंग, नॉइज़, शार्पनेस", de: "Auto levels, colour, denoise, sharpen", view: enhance },
  { id: "upscale", cat: "photo", icon: "image", c: "#8b5cf6", hi: "फ़ोटो बड़ी करें (अपस्केल)", en: "Upscale photo", dh: "2×/3×/4× और शार्पन", de: "2×/3×/4× with sharpening", view: upscale },
  { id: "compress", cat: "photo", icon: "download", c: "#14b8a6", hi: "कंप्रेसर / कन्वर्टर", en: "Compressor / converter", dh: "KB से कम, JPG/PNG/WebP, कई फ़ोटो", de: "Under-KB target, JPG/PNG/WebP, batch", view: imageTool },
  { id: "crop", cat: "photo", icon: "grid", c: "#0ea5e9", hi: "क्रॉप / रोटेट / साइज़", en: "Crop / rotate / resize", dh: "सोशल मीडिया और फ़ॉर्म के साइज़", de: "Social and form-photo sizes", view: crop },
  { id: "watermark", cat: "photo", icon: "edit", c: "#64748b", hi: "वॉटरमार्क", en: "Watermark", dh: "हिंदी टेक्स्ट, कोने में या पूरी फ़ोटो पर", de: "Hindi text, corner or tiled", view: watermark },
  { id: "passport", cat: "photo", icon: "image", c: "#f43f8e", hi: "पासपोर्ट / ID फ़ोटो शीट", en: "Passport / ID photo sheet", dh: "एक फ़ोटो से पूरी प्रिंट शीट", de: "One photo to a full print sheet", view: passport },
  { id: "imgpdf", cat: "pdf", icon: "box", c: "#7c3aed", hi: "फ़ोटो → PDF", en: "Images → PDF", dh: "कई फ़ोटो से एक PDF", de: "Many photos into one PDF", view: imgPdf },
  { id: "pdfmerge", cat: "pdf", icon: "copy", c: "#ef4444", hi: "PDF जोड़ें (मर्ज)", en: "Merge PDFs", dh: "कई PDF एक में, क्रम बदलकर", de: "Many PDFs into one, reorderable", view: pdfMerge },
  { id: "pdforg", cat: "pdf", icon: "list", c: "#f97316", hi: "PDF पेज: निकालें / हटाएँ / घुमाएँ", en: "PDF pages: extract / delete / rotate", dh: "हर पेज अलग (ZIP), पेज नंबर", de: "Split to ZIP, add page numbers", view: pdfOrganize },
  { id: "pdfsmall", cat: "pdf", icon: "download", c: "#06b6d4", hi: "PDF छोटी करें", en: "Compress PDF", dh: "हल्का या तगड़ा (स्कैन वाली भारी PDF)", de: "Light or strong (heavy scans)", view: pdfCompress },
  { id: "pdfimg", cat: "pdf", icon: "image", c: "#a855f7", hi: "PDF → फ़ोटो", en: "PDF → images", dh: "हर पेज PNG/JPG, ZIP में", de: "Every page as PNG/JPG, ZIP", view: pdfToImages },
  { id: "card", cat: "india", icon: "edit", c: "#0f766e", hi: "विज़िटिंग / ID कार्ड", en: "Visiting / ID card", dh: "300 DPI, A4 शीट पर कई कॉपी", de: "300 DPI, multi-up A4 sheet", view: cardTool },
  { id: "barcode", cat: "india", icon: "list", c: "#334155", hi: "बारकोड (Code128, EAN-13)", en: "Barcode (Code128, EAN-13)", dh: "दुकान/स्टॉक के लिए, PNG और SVG", de: "For shops and stock, PNG and SVG", view: barcodeTool },
  { id: "palette", cat: "photo", icon: "wand", c: "#f97316", hi: "फ़ोटो से रंग-पैलेट", en: "Colour palette from photo", dh: "मुख्य 6 रंग, HEX कॉपी", de: "Top 6 colours, copy HEX", view: paletteTool },
  { id: "iconpack", cat: "photo", icon: "image", c: "#0ea5e9", hi: "आइकन / favicon पैक", en: "Icon / favicon pack", dh: "एक इमेज से सारे साइज़ (ZIP)", de: "All sizes from one image (ZIP)", view: iconPackTool },
  { id: "convert", cat: "photo", icon: "download", c: "#10b981", hi: "फ़ॉर्मेट बदलें + EXIF/लोकेशन हटाएँ", en: "Convert format + strip EXIF", dh: "WebP / JPG / PNG, कई फ़ोटो", de: "WebP / JPG / PNG, many photos", view: convertTool },
  { id: "collage", cat: "photo", icon: "image", c: "#ec4899", hi: "फ़ोटो कोलाज", en: "Photo collage", dh: "2–9 फ़ोटो, ग्रिड", de: "2–9 photos, grid", view: collageTool },
  { id: "resume", cat: "india", icon: "edit", c: "#0f766e", hi: "रिज़्यूमे / बायोडाटा", en: "Resume / biodata", dh: "हिंदी या English, A4 PDF", de: "Hindi or English, A4 PDF", view: resumeTool },
  { id: "typing", cat: "india", icon: "edit", c: "#9333ea", hi: "हिंदी टाइपिंग (Roman → देवनागरी)", en: "Hindi typing (Roman → Devanagari)", dh: "namaste → नमस्ते, कॉपी करें", de: "namaste → नमस्ते, copy", view: () => typingTool() },
  { id: "scan", cat: "pdf", icon: "list", c: "#475569", hi: "डॉक्यूमेंट स्कैनर (फ़ोटो → साफ़ PDF)", en: "Document scanner (photo → clean PDF)", dh: "परछाईं हटाएँ, काला-सफ़ेद, कई पेज", de: "Remove shadows, B&W, multi-page", view: scanTool },
  { id: "aitext", cat: "india", icon: "wand", c: "#2563eb", hi: "AI लेखक (Gemini)", en: "AI writer (Gemini)", dh: "शुभकामना, कैप्शन, OCR सुधार, अनुवाद", de: "Greetings, captions, OCR fix, translate", view: aiTool },
  { id: "greet", cat: "india", icon: "wand", c: "#e11d48", hi: "शुभकामना / पोस्टर मेकर", en: "Greeting / poster maker", dh: "22 सजावटी हिंदी फ़ॉन्ट, 8 बैकग्राउंड", de: "22 decorative Hindi fonts, 8 backgrounds", view: greetingTool },
  { id: "ocr", cat: "india", icon: "wand", c: "#7c3aed", hi: "फ़ोटो / स्कैन से टेक्स्ट (हिंदी OCR)", en: "Text from photo / scan (Hindi OCR)", dh: "हिंदी + English, ब्राउज़र में ही", de: "Hindi + English, in your browser", view: ocrTool },
  { id: "invoice", cat: "india", icon: "list", c: "#16a34a", hi: "GST बिल / इनवॉइस", en: "GST invoice maker", dh: "CGST+SGST/IGST, रकम शब्दों में, PDF", de: "CGST+SGST/IGST, amount in words, PDF", view: invoiceTool },
  { id: "pdfstamp", cat: "pdf", icon: "edit", c: "#dc2626", hi: "PDF पर वॉटरमार्क / साइन", en: "PDF watermark / signature", dh: "हिंदी टेक्स्ट या मुहर की इमेज", de: "Hindi text or stamp image", view: () => pdfStamp(loadLib, readBuf) },
  { id: "qr", cat: "india", icon: "grid", c: "#16a34a", hi: "QR कोड (UPI, WhatsApp…)", en: "QR code (UPI, WhatsApp…)", dh: "PNG और SVG, रंग के साथ", de: "PNG and SVG, custom colours", view: qrTool },
  { id: "kruti", cat: "india", icon: "edit", c: "#f59e0b", hi: "Kruti Dev → यूनिकोड", en: "Kruti Dev → Unicode", dh: "पुराना हिंदी टेक्स्ट यूनिकोड में", de: "Old Hindi text to Unicode", beta: true, view: kruti },
  { id: "words", cat: "india", icon: "list", c: "#dc2626", hi: "रकम शब्दों में (₹)", en: "Rupees in words", dh: "हिंदी + English, लाख-करोड़", de: "Hindi + English, lakh/crore", view: wordsTool },
  { id: "size", cat: "india", icon: "grid", c: "#0ea5e9", hi: "प्रिंट साइज़ कैलकुलेटर", en: "Print size calculator", dh: "फ्लेक्स: फ़ीट ↔ मिमी ↔ पिक्सल", de: "Flex: ft ↔ mm ↔ pixels", view: sizeCalc },
];
const CATS = [["photo", "फ़ोटो", "Photos"], ["pdf", "PDF", "PDF"], ["india", "भारत और हिंदी", "India & Hindi"]];
const EXT = [
  ["Penpot", "MPL-2.0", "https://penpot.app", L("UI/मॉकअप, Figma जैसा", "UI / mockups, Figma-like")],
  ["Blender", "GPL", "https://www.blender.org", L("3D और VFX", "3D & VFX")],
  ["Krita", "GPL", "https://krita.org", L("पेंटिंग / ब्रश", "Painting / brushes")],
  ["Inkscape", "GPL", "https://inkscape.org", L("वेक्टर", "Vector")],
  ["Scribus", "GPL", "https://www.scribus.net", L("पेज लेआउट / DTP", "Page layout / DTP")],
  ["Synfig", "GPL", "https://www.synfig.org", L("2D एनिमेशन", "2D animation")],
  ["FontForge", "GPL", "https://fontforge.org", L("फ़ॉन्ट एडिटर", "Font editor")],
  ["OBS Studio", "GPL", "https://obsproject.com", L("स्क्रीन रिकॉर्डर / लाइव", "Screen recorder / live")],
];

export async function render(ctx) {
  const cur = location.hash.replace(/^#\/?/, "").split("?")[0].split("/")[1]; const t = TOOLS.find((x) => x.id === cur);
  if (t) return h("div.view", h("div.page-head", h("div", h("a", { href: "#/tools" }, "← " + L("सभी टूल", "All tools")), h("h1", L(t.hi, t.en)))), h("section.card.tool", t.view()));
  return h("div.view", h("div.page-head", h("div", h("h1", L("टूल्स", "Tools")), h("p.sub", L("छोटे काम के टूल, सब आपके ब्राउज़र में चलते हैं। कुछ भी सर्वर पर नहीं जाता।", "Quick utilities that run entirely in your browser. Nothing is uploaded.")))),
    CATS.map(([k, hi, en]) => h("section", h("h2.cat", L(hi, en)), h("div.tiles", TOOLS.filter((x) => x.cat === k).map((x) => h("a.tile", { style: { "--c": x.c }, href: "#/tools/" + x.id }, h("span.appicon", { style: { width: "42px", height: "42px", background: x.c } }, icon(x.icon, 24)), h("b", L(x.hi, x.en)), h("small", L(x.dh, x.de)), x.beta ? h("span.badge.warn", "BETA") : h("span.badge", L("ऑफ़लाइन", "Offline"))))))),
    h("section", h("h2.cat", L("बाहर के ओपन-सोर्स टूल", "Open-source tools outside Tulika")), h("p.sub", L("ये अलग ऐप हैं (हमारे कोड में शामिल नहीं), इसलिए लाइसेंस की दिक्कत नहीं। इन्हें साथ में इस्तेमाल कीजिए।", "Separate apps (not part of our code), so no licence mixing. Use them alongside Tulika.")),
      h("div.tgrid", EXT.map(([n, lic, url, d]) => h("a.tpl", { href: url, target: "_blank", rel: "noopener" }, h("b", n), h("small", d), h("span.badge", lic), h("span.apptag", icon("ext", 14), url.replace("https://", "")))))));
}

function typingTool() {
  const a = h("textarea", { rows: 5, placeholder: "namaste, aap kaise hain?", autofocus: true }), b = h("textarea", { rows: 5, readonly: true }); let dg = false;
  const upd = () => { b.value = romanToDevanagari(a.value, { digits: dg }); }; a.oninput = upd;
  return h("div.form", h("p.sub", getLang() === "hi" ? "अंग्रेज़ी अक्षरों में लिखिए, हिंदी बनती जाएगी। aa=ा, ii/ee=ी, uu/oo=ू, M=ं, MM=ँ, H=ः, T D N = ट ड ण, Sh=ष, R=ड़, { } में लिखा जैसा है वैसा रहेगा। संयुक्ताक्षर: kya = क्या; अलग रखने के लिए a लिखिए: shubhakaamanaa = शुभकामना।" : "Type in English letters, Hindi appears. aa=ा, ii/ee=ी, uu/oo=ू, M=ं, MM=ँ, H=ः, T D N = ट ड ण, Sh=ष, R=ड़, text in { } stays as typed. Conjunct: kya = क्या; write the a to keep letters apart: shubhakaamanaa = शुभकामना."),
    h("label.fld", h("span", "Roman"), a), h("label.fld", h("span", "देवनागरी"), b),
    h("label.fld", h("span", getLang() === "hi" ? "अंक देवनागरी में" : "Devanagari digits"), h("input", { type: "checkbox", onchange: (e) => { dg = e.target.checked; upd(); } })),
    h("button.ghost", { onclick: async () => { try { await navigator.clipboard.writeText(b.value); toast(getLang() === "hi" ? "कॉपी हो गया" : "Copied"); } catch { b.select(); } } }, icon("copy", 16), getLang() === "hi" ? "कॉपी" : "Copy"));
}

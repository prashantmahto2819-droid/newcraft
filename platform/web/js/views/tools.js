import { h, icon, toast, downloadBlob } from "../ui.js";
import { getLang, bytes } from "../i18n.js";
import { krutiToUnicode } from "../tools/kruti.js";
import { jpegsToPdf, canvasJpeg, loadImg } from "../tools/pdf.js";
import { pickFile } from "./shared.js";

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

// ---------- 3. Image resize / compress / convert ----------
function imageTool() {
  let fmt = "image/jpeg", q = 80, maxW = 1600, list = []; const out = h("div.rows");
  const draw = () => { out.textContent = ""; list.forEach((r) => out.append(h("div.row", h("div.grow", h("b", r.name), h("small", `${bytes(r.before)} → ${bytes(r.blob.size)} · ${r.w}×${r.h}`)), h("button.ghost", { onclick: () => downloadBlob(r.name, r.blob) }, icon("download", 16))))); };
  const run = async (files) => {
    list = [];
    for (const f of files) {
      const im = await loadImg(f), s = Math.min(1, maxW / im.width), w = Math.round(im.width * s), hh = Math.round(im.height * s);
      const c = document.createElement("canvas"); c.width = w; c.height = hh; const x = c.getContext("2d"); if (fmt === "image/jpeg") { x.fillStyle = "#fff"; x.fillRect(0, 0, w, hh); } x.drawImage(im, 0, 0, w, hh);
      const blob = await new Promise((r) => c.toBlob(r, fmt, q / 100)); const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[fmt];
      list.push({ name: f.name.replace(/\.[^.]+$/, "") + "-tulika." + ext, blob, before: f.size, w, h: hh }); URL.revokeObjectURL(im.src);
    } draw();
  };
  return h("div.form", note(L("एक साथ कई फ़ोटो छोटी करें, साइज़ घटाएँ या JPG/PNG/WebP में बदलें।", "Shrink, resize or convert many photos at once to JPG/PNG/WebP.")),
    h("div.grid2", field(L("फ़ॉर्मैट", "Format"), sel([["image/jpeg", "JPG"], ["image/png", "PNG"], ["image/webp", "WebP"]], fmt, (v) => (fmt = v))), field(L("अधिकतम चौड़ाई (px)", "Max width (px)"), num(maxW, { onchange: (e) => (maxW = Math.max(16, +e.target.value || 1600)) })),
      field(L("क्वालिटी %", "Quality %"), num(q, { min: 1, max: 100, onchange: (e) => (q = Math.min(100, Math.max(1, +e.target.value || 80))) }))),
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
  { id: "kruti", icon: "edit", c: "#f59e0b", hi: "Kruti Dev → यूनिकोड", en: "Kruti Dev → Unicode", dh: "पुराना हिंदी टेक्स्ट यूनिकोड में", de: "Old Hindi text to Unicode", beta: true, view: kruti },
  { id: "passport", icon: "image", c: "#f43f8e", hi: "पासपोर्ट / ID फ़ोटो शीट", en: "Passport / ID photo sheet", dh: "एक फ़ोटो से पूरी प्रिंट शीट", de: "One photo to a full print sheet", view: passport },
  { id: "image", icon: "wand", c: "#14b8a6", hi: "फ़ोटो छोटी / बदलें", en: "Compress / convert photos", dh: "साइज़ घटाएँ, JPG/PNG/WebP", de: "Shrink, resize, JPG/PNG/WebP", view: imageTool },
  { id: "imgpdf", icon: "box", c: "#8b5cf6", hi: "फ़ोटो → PDF", en: "Images → PDF", dh: "कई फ़ोटो से एक PDF", de: "Many photos into one PDF", view: imgPdf },
  { id: "size", icon: "grid", c: "#0ea5e9", hi: "प्रिंट साइज़ कैलकुलेटर", en: "Print size calculator", dh: "फ्लेक्स: फ़ीट ↔ मिमी ↔ पिक्सल", de: "Flex: ft ↔ mm ↔ pixels", view: sizeCalc },
];
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
    h("div.tiles", TOOLS.map((x) => h("a.tile", { style: { "--c": x.c }, href: "#/tools/" + x.id }, h("span.appicon", { style: { width: "42px", height: "42px", background: x.c } }, icon(x.icon, 24)), h("b", L(x.hi, x.en)), h("small", L(x.dh, x.de)), x.beta ? h("span.badge.warn", "BETA") : h("span.badge", L("ऑफ़लाइन", "Offline"))))),
    h("section", h("h2.cat", L("बाहर के ओपन-सोर्स टूल", "Open-source tools outside Tulika")), h("p.sub", L("ये अलग ऐप हैं (हमारे कोड में शामिल नहीं), इसलिए लाइसेंस की दिक्कत नहीं। इन्हें साथ में इस्तेमाल कीजिए।", "Separate apps (not part of our code), so no licence mixing. Use them alongside Tulika.")),
      h("div.tgrid", EXT.map(([n, lic, url, d]) => h("a.tpl", { href: url, target: "_blank", rel: "noopener" }, h("b", n), h("small", d), h("span.badge", lic), h("span.apptag", icon("ext", 14), url.replace("https://", "")))))));
}

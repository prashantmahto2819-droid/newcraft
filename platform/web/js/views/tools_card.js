import { h, icon, toast, downloadBlob, debounce } from "../ui.js";
import { jpegsToPdf, canvasJpeg, loadImg } from "../tools/pdf.js";
import { qrCanvas } from "../tools/qr.js";
import { code128, ean13, barcodeCanvas, barcodeSvg } from "../tools/barcode.js";
import { pickFile } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

// ---------- Barcode ----------
export function barcodeTool() {
  let kind = "c128", text = "TULIKA-2026", fg = "#000000", bg = "#ffffff"; const out = h("div.canvasbox"), msg = h("small");
  const build = () => { if (kind === "ean13") { const r = ean13(text.trim()); return { m: r.modules, label: r.full.replace(/^(\d)(\d{6})(\d{6})$/, "$1 $2 $3") }; } return { m: code128(text), label: text }; };
  const draw = () => { out.textContent = ""; msg.textContent = ""; if (!text) return; try { const { m, label } = build(); const c = barcodeCanvas(m, label, { scale: 3, height: 120, fg, bg }); c.className = "prev"; out.append(c); } catch (e) { msg.textContent = kind === "ean13" ? L("EAN-13 के लिए 12 या 13 अंक चाहिए (सही चेक अंक के साथ)", "EAN-13 needs 12 or 13 digits (with a valid check digit)") : L("सिर्फ़ अंग्रेज़ी अक्षर/अंक/चिह्न चलेंगे", "Only English letters, digits and symbols"); } };
  const dl = (t) => { try { const { m, label } = build(); if (t === "svg") downloadBlob("barcode.svg", new Blob([barcodeSvg(m, label, { fg, bg })], { type: "image/svg+xml" })); else barcodeCanvas(m, label, { scale: 6, height: 240, fg, bg }).toBlob((b) => downloadBlob("barcode.png", b)); } catch { toast(L("पहले सही जानकारी भरिए", "Enter valid data first"), "err"); } };
  draw();
  return h("div.form", note(L("दुकान/स्टॉक के लिए बारकोड: Code 128 (कोई भी अंग्रेज़ी टेक्स्ट) और EAN-13 (प्रोडक्ट के 13 अंक)।", "Barcodes for shops and stock: Code 128 (any English text) and EAN-13 (13-digit product code).")),
    h("div.grid2", field(L("प्रकार", "Type"), sel([["c128", "Code 128"], ["ean13", "EAN-13"]], kind, (v) => { kind = v; text = v === "ean13" ? "890123456789" : "TULIKA-2026"; draw(); })), field(L("टेक्स्ट / अंक", "Text / digits"), textIn(text, (v) => { text = v; draw(); }, { value: text })),
      field(L("रंग", "Colour"), h("input", { type: "color", value: fg, oninput: (e) => { fg = e.target.value; draw(); } })), field(L("बैकग्राउंड", "Background"), h("input", { type: "color", value: bg, oninput: (e) => { bg = e.target.value; draw(); } }))),
    h("div.btnrow", h("button.primary", { onclick: () => dl("png") }, icon("download", 16), "PNG"), h("button.primary", { onclick: () => dl("svg") }, icon("download", 16), "SVG")), msg, out);
}

// ---------- Visiting / ID card ----------
const FONT = '"Noto Sans Devanagari", Inter, system-ui, sans-serif', MM = 25.4, PX = (mm) => Math.round((mm / MM) * 300);
const LAYOUTS = { v1: { w: 90, h: 54 }, v2: { w: 90, h: 54 }, id: { w: 54, h: 86 } };
function fit(x, text, maxW, size, weight = 600, min = 14) { let s = size; do { x.font = `${weight} ${s}px ${FONT}`; if (x.measureText(text).width <= maxW) break; s -= 2; } while (s > min); return s; }
function drawCard(cv, layout, d, images) {
  const { w, h } = LAYOUTS[layout], W = PX(w), H = PX(h); cv.width = W; cv.height = H; const x = cv.getContext("2d"), pad = Math.round(W * 0.06); x.textBaseline = "alphabetic";
  const contact = [d.phone, d.email, d.web, d.address].filter(Boolean);
  const lines = (x0, y0, maxW, size, color, gap) => { let y = y0; for (const t of contact) { x.fillStyle = d.accent; x.fillRect(x0, y - size * 0.55, size * 0.38, size * 0.38); x.fillStyle = color; fit(x, t, maxW - size, size, 500, 12); x.fillText(t, x0 + size * 0.8, y); y += gap; } return y; };
  const qr = (size, px, py) => { if (!d.qr) return; const t = `MECARD:N:${d.name};TEL:${d.phone};EMAIL:${d.email};URL:${d.web};;`; try { const c = qrCanvas(t, { size, margin: 1 }); x.drawImage(c, px, py, size, size); } catch {} };
  if (layout === "v1") {
    x.fillStyle = d.bg; x.fillRect(0, 0, W, H); const bw = Math.round(W * 0.27); x.fillStyle = d.accent; x.fillRect(0, 0, bw, H);
    if (images.logo) { const s = bw * 0.62, r = Math.min(s / images.logo.width, s / images.logo.height); x.drawImage(images.logo, (bw - images.logo.width * r) / 2, H * 0.12, images.logo.width * r, images.logo.height * r); }
    x.fillStyle = "#fff"; fit(x, d.company, bw - pad, 34, 700); x.textAlign = "center"; x.fillText(d.company, bw / 2, H * 0.78); x.textAlign = "left";
    const tx = bw + pad, tw = W - tx - pad; x.fillStyle = d.text; fit(x, d.name, tw, 60, 700, 24); x.fillText(d.name, tx, H * 0.22); x.fillStyle = d.accent; fit(x, d.title, tw, 34, 600, 16); x.fillText(d.title, tx, H * 0.22 + 46);
    x.fillStyle = d.accent; x.fillRect(tx, H * 0.22 + 70, 70, 5); lines(tx, H * 0.55, tw - (d.qr ? 150 : 0), 28, d.text, 44); qr(130, W - pad - 130, H - pad - 130);
  } else if (layout === "v2") {
    x.fillStyle = d.bg; x.fillRect(0, 0, W, H); x.fillStyle = d.accent; x.fillRect(0, 0, W, 14); x.fillRect(0, H - 14, W, 14); x.textAlign = "center";
    if (images.logo) { const s = 90, r = Math.min(s / images.logo.width, s / images.logo.height); x.drawImage(images.logo, W / 2 - (images.logo.width * r) / 2, 40, images.logo.width * r, images.logo.height * r); }
    x.fillStyle = d.text; fit(x, d.name, W - 2 * pad, 62, 700, 24); x.fillText(d.name, W / 2, H * 0.42); x.fillStyle = d.accent; fit(x, d.title, W - 2 * pad, 34, 600, 16); x.fillText(d.title, W / 2, H * 0.42 + 46);
    x.fillStyle = d.text; fit(x, d.company, W - 2 * pad, 30, 700, 14); x.fillText(d.company, W / 2, H * 0.42 + 90);
    const sz = 26; let y = H * 0.74; x.font = `500 ${sz}px ${FONT}`; for (let i = 0; i < contact.length; i += 2) { const t = contact.slice(i, i + 2).join("   •   "); fit(x, t, W - 2 * pad, sz, 500, 12); x.fillText(t, W / 2, y); y += 38; } x.textAlign = "left";
  } else {
    x.fillStyle = d.bg; x.fillRect(0, 0, W, H); x.fillStyle = d.accent; x.fillRect(0, 0, W, Math.round(H * 0.2)); x.fillRect(0, H - 30, W, 30); x.fillStyle = "#fff"; x.textAlign = "center"; fit(x, d.company, W - 2 * pad, 40, 700, 16); x.fillText(d.company, W / 2, H * 0.12);
    const ps = Math.round(W * 0.56), px = (W - ps) / 2, py = H * 0.25; x.fillStyle = "#e5e7eb"; x.fillRect(px, py, ps, ps * 1.15);
    if (images.photo) { const im = images.photo, r = Math.max(ps / im.width, (ps * 1.15) / im.height); x.save(); x.beginPath(); x.rect(px, py, ps, ps * 1.15); x.clip(); x.drawImage(im, px + (ps - im.width * r) / 2, py + (ps * 1.15 - im.height * r) / 2, im.width * r, im.height * r); x.restore(); }
    let y = py + ps * 1.15 + 62; x.fillStyle = d.text; fit(x, d.name, W - 2 * pad, 50, 700, 20); x.fillText(d.name, W / 2, y); y += 40; x.fillStyle = d.accent; fit(x, d.title, W - 2 * pad, 30, 600, 14); x.fillText(d.title, W / 2, y); y += 44;
    x.fillStyle = d.text; for (const t of [d.idno && "ID: " + d.idno, d.phone, d.validity && L("मान्य: ", "Valid: ") + d.validity].filter(Boolean)) { fit(x, t, W - 2 * pad, 26, 500, 12); x.fillText(t, W / 2, y); y += 36; } x.textAlign = "left";
  }
  x.strokeStyle = "rgba(0,0,0,.15)"; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
}
export function cardTool() {
  const d = { name: "प्रशांत महतो", title: L("प्रबंध निदेशक", "Managing Director"), company: "Tulika", phone: "+91 98765 43210", email: "name@example.com", web: "www.example.com", address: L("रायपुर, छत्तीसगढ़", "Raipur, Chhattisgarh"), idno: "", validity: "", accent: "#0f766e", bg: "#ffffff", text: "#111827", qr: false };
  let layout = "v1"; const images = {}; const cv = h("canvas.prev"), box = h("div.canvasbox", cv);
  const draw = debounce(async () => { try { await document.fonts.load(`700 40px "Noto Sans Devanagari"`); await document.fonts.load(`500 28px "Noto Sans Devanagari"`); } catch {} drawCard(cv, layout, d, images); }, 60);
  const inp = (label, key) => field(label, textIn(d[key], (v) => { d[key] = v; draw(); }));
  const color = (label, key) => field(label, h("input", { type: "color", value: d[key], oninput: (e) => { d[key] = e.target.value; draw(); } }));
  const img = (label, key) => h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { images[key] = await loadImg(f); draw(); }) }, icon("image", 16), label);
  const png = () => cv.toBlob((b) => downloadBlob("card.png", b));
  const pdf = async () => { const { w, h: hh } = LAYOUTS[layout]; downloadBlob("card.pdf", jpegsToPdf([{ jpeg: await canvasJpeg(cv, 0.95), w: cv.width, h: cv.height, pw: (w / MM) * 72, ph: (hh / MM) * 72, x: 0, y: 0, iw: (w / MM) * 72, ih: (hh / MM) * 72 }])); };
  const sheet = async () => { const { w, h: hh } = LAYOUTS[layout], cols = layout === "id" ? 3 : 2, rows = layout === "id" ? 3 : 5, gap = 3, W = PX(210), H = PX(297), s = document.createElement("canvas"); s.width = W; s.height = H; const x = s.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);
    const gw = cols * w + (cols - 1) * gap, gh = rows * hh + (rows - 1) * gap, ox = (210 - gw) / 2, oy = (297 - gh) / 2; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { x.drawImage(cv, PX(ox + c * (w + gap)), PX(oy + r * (hh + gap))); }
    downloadBlob("cards-a4.pdf", jpegsToPdf([{ jpeg: await canvasJpeg(s, 0.93), w: W, h: H, pw: (210 / MM) * 72, ph: (297 / MM) * 72, x: 0, y: 0, iw: (210 / MM) * 72, ih: (297 / MM) * 72 }])); toast(`${cols * rows} ${L("कार्ड", "cards")}`); };
  draw();
  return h("div.form", note(L("विज़िटिंग कार्ड (90×54 मिमी) या आईडी कार्ड (54×86 मिमी) बनाइए: 300 DPI PNG/PDF, या A4 शीट पर कई कॉपी (कटिंग के लिए)।", "Make visiting cards (90×54 mm) or ID cards (54×86 mm): 300 DPI PNG/PDF, or a multi-up A4 sheet for cutting.")),
    box, field(L("डिज़ाइन", "Design"), sel([["v1", L("विज़िटिंग: साइड पट्टी", "Visiting: side band")], ["v2", L("विज़िटिंग: बीच में", "Visiting: centred")], ["id", L("आईडी कार्ड (खड़ा)", "ID card (portrait)")]], layout, (v) => { layout = v; draw(); })),
    h("div.grid2", inp(L("नाम", "Name"), "name"), inp(L("पद", "Title"), "title"), inp(L("संस्था / कंपनी", "Company"), "company"), inp(L("फ़ोन", "Phone"), "phone"), inp(L("ईमेल", "Email"), "email"), inp(L("वेबसाइट", "Website"), "web"), inp(L("पता", "Address"), "address"), inp(L("आईडी नंबर (आईडी कार्ड)", "ID number (ID card)"), "idno"), inp(L("मान्यता तिथि (आईडी कार्ड)", "Valid till (ID card)"), "validity"),
      color(L("मुख्य रंग", "Accent"), "accent"), color(L("बैकग्राउंड", "Background"), "bg"), color(L("अक्षर", "Text"), "text")),
    h("label.chk", h("input", { type: "checkbox", onchange: (e) => { d.qr = e.target.checked; draw(); } }), L("संपर्क QR जोड़ें (विज़िटिंग साइड पट्टी)", "Add contact QR (visiting, side band)")),
    h("div.btnrow", img(L("लोगो", "Logo"), "logo"), img(L("फ़ोटो (आईडी)", "Photo (ID)"), "photo")), h("div.btnrow", h("button.primary", { onclick: png }, icon("download", 16), "PNG"), h("button.primary", { onclick: pdf }, icon("download", 16), "PDF"), h("button.primary", { onclick: sheet }, icon("download", 16), L("A4 शीट PDF", "A4 sheet PDF"))));
}

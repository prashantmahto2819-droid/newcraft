import { h, icon, toast, downloadBlob } from "../ui.js";
import { jpegsToPdf, canvasJpeg, loadImg } from "../tools/pdf.js";
import { rupeesInWords } from "../tools/words.js";
import { pickFile } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

const FONT = '"Noto Sans Devanagari", Inter, system-ui, sans-serif';
const fontsReady = () => Promise.all(['500 30px "Noto Sans Devanagari"', '700 30px "Noto Sans Devanagari"', '700 30px Inter'].map((f) => document.fonts.load(f))).catch(() => {});
const paise = (v) => Math.round((parseFloat(String(v).replace(/,/g, "")) || 0) * 100);
export const money = (p) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// items: [{desc, qty, rate, gst}] -> exact totals in paise. interstate => IGST, otherwise CGST+SGST halves (odd paise go to CGST).
export function calcInvoice(items, interstate) {
  const rows = items.filter((i) => i.desc || paise(i.rate)).map((i) => { const q = parseFloat(i.qty) || 0, base = Math.round(q * paise(i.rate)), g = parseFloat(i.gst) || 0, tax = Math.round((base * g) / 100); return { ...i, q, base, g, tax, total: base + tax }; });
  const sub = rows.reduce((s, r) => s + r.base, 0), tax = rows.reduce((s, r) => s + r.tax, 0), exact = sub + tax, grand = Math.round(exact / 100) * 100;
  const cgst = interstate ? 0 : Math.ceil(tax / 2), sgst = interstate ? 0 : tax - cgst;
  return { rows, sub, tax, cgst, sgst, igst: interstate ? tax : 0, exact, round: grand - exact, grand };
}

export function invoiceTool() {
  const d = { seller: "", sgstin: "", saddr: "", buyer: "", bgstin: "", baddr: "", no: "001", date: new Date().toISOString().slice(0, 10), inter: false, note: "धन्यवाद! Thank you.", accent: "#0f766e", title: "TAX INVOICE" };
  const items = [{ desc: "", qty: "1", rate: "", gst: "18" }]; let logo = null;
  const box = h("div.rows"), out = h("div.canvasbox"), sum = h("p.sub");
  const calc = () => calcInvoice(items, d.inter);
  const redraw = () => { const c = calc(); sum.textContent = `${L("कुल", "Total")}: ₹${money(c.grand)}`; const cv = draw(d, items, c, logo, 900); cv.className = "prev"; out.textContent = ""; out.append(cv); };
  const rowsUi = () => { box.textContent = ""; items.forEach((it, i) => box.append(h("div.grid2", { style: { alignItems: "end" } },
    field(L("सामान / सेवा", "Item"), textIn(it.desc, (v) => { it.desc = v; redraw(); })), field(L("मात्रा", "Qty"), textIn(it.qty, (v) => { it.qty = v; redraw(); }, { inputmode: "decimal" })),
    field(L("दर ₹", "Rate ₹"), textIn(it.rate, (v) => { it.rate = v; redraw(); }, { inputmode: "decimal" })), field("GST %", sel([["0", "0"], ["5", "5"], ["12", "12"], ["18", "18"], ["28", "28"]], it.gst, (v) => { it.gst = v; redraw(); })),
    items.length > 1 ? h("button.icon-btn", { "aria-label": "remove", onclick: () => { items.splice(i, 1); rowsUi(); redraw(); } }, icon("x", 16)) : null))); };
  const txt = (k, label, ph) => field(label, textIn(d[k], (v) => { d[k] = v; redraw(); }, { placeholder: ph || "" }));
  const full = async (kind) => { await fontsReady(); const c = calc(); if (!c.rows.length) return toast(L("कम से कम एक आइटम भरिए", "Add at least one item"), "err"); const cv = draw(d, items, c, logo, 2480);
    if (kind === "png") cv.toBlob((b) => downloadBlob(`invoice-${d.no}.png`, b)); else downloadBlob(`invoice-${d.no}.pdf`, new Blob([jpegsToPdf([{ jpeg: await canvasJpeg(cv, 0.92), w: cv.width, h: cv.height, pw: 595.28, ph: 841.89, x: 0, y: 0, iw: 595.28, ih: 841.89 }])], { type: "application/pdf" })); };
  rowsUi(); redraw(); fontsReady().then(redraw);
  return h("div.form", note(L("GST बिल/इनवॉइस बनाइए (CGST+SGST या IGST अपने आप, रकम शब्दों में)। डेटा ब्राउज़र से बाहर नहीं जाता।", "Make a GST invoice (CGST+SGST or IGST automatically, amount in words). Data stays in your browser.")),
    h("div.grid2", txt("seller", L("आपकी फ़र्म", "Your business")), txt("sgstin", "GSTIN", "22AAAAA0000A1Z5"), txt("saddr", L("आपका पता", "Your address")), txt("buyer", L("ग्राहक", "Customer")), txt("bgstin", L("ग्राहक GSTIN", "Customer GSTIN")), txt("baddr", L("ग्राहक का पता", "Customer address")),
      txt("no", L("इनवॉइस नं.", "Invoice no.")), field(L("तारीख", "Date"), h("input", { type: "date", value: d.date, oninput: (e) => { d.date = e.target.value; redraw(); } })),
      field(L("टैक्स", "Tax"), sel([["intra", L("CGST + SGST (राज्य के अंदर)", "CGST + SGST (same state)")], ["inter", L("IGST (दूसरा राज्य)", "IGST (other state)")]], "intra", (v) => { d.inter = v === "inter"; redraw(); })),
      field(L("रंग", "Colour"), h("input", { type: "color", value: d.accent, oninput: (e) => { d.accent = e.target.value; redraw(); } }))),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { logo = await loadImg(f); redraw(); }) }, icon("image", 16), L("लोगो", "Logo"))), box,
    h("div.btnrow", h("button.ghost", { onclick: () => { items.push({ desc: "", qty: "1", rate: "", gst: "18" }); rowsUi(); } }, icon("plus", 16), L("आइटम जोड़िए", "Add item"))), txt("note", L("नीचे का नोट", "Footer note")), sum,
    h("div.btnrow", h("button.primary", { onclick: () => full("pdf") }, icon("download", 16), "PDF"), h("button.primary", { onclick: () => full("png") }, icon("download", 16), "PNG")), out);
}

function draw(d, items, c, logo, W) {
  const S = W / 2480, H = Math.round(3508 * S), cv = document.createElement("canvas"); cv.width = W; cv.height = H; const x = cv.getContext("2d"), P = (v) => v * S, m = P(150);
  x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.fillStyle = d.accent; x.fillRect(0, 0, W, P(40));
  const fs = (size, w = 500) => { x.font = `${w} ${P(size)}px ${FONT}`; };
  let y = P(190); if (logo) { const r = Math.min(P(260) / logo.width, P(160) / logo.height); x.drawImage(logo, m, y - P(110), logo.width * r, logo.height * r); }
  x.textAlign = "right"; x.fillStyle = d.accent; fs(80, 800); x.fillText(d.title, W - m, y); x.fillStyle = "#374151"; fs(38); x.fillText(`# ${d.no}   ${d.date}`, W - m, y + P(60)); x.textAlign = "left";
  y += P(130); x.fillStyle = "#111"; fs(50, 700); x.fillText(d.seller || "—", m, y); fs(34); x.fillStyle = "#4b5563"; if (d.sgstin) x.fillText("GSTIN: " + d.sgstin, m, y + P(48)); x.fillText(d.saddr, m, y + P(94), W / 2 - m);
  x.textAlign = "right"; x.fillStyle = "#111"; fs(34, 700); x.fillText(L("ग्राहक / Bill to", "Bill to"), W - m, y); fs(34); x.fillStyle = "#4b5563"; x.fillText(d.buyer, W - m, y + P(48)); if (d.bgstin) x.fillText("GSTIN: " + d.bgstin, W - m, y + P(94)); x.fillText(d.baddr, W - m, y + P(140), W / 2 - m); x.textAlign = "left";
  y += P(230); const cols = [m, m + P(90), m + P(1000), m + P(1250), m + P(1550), m + P(1750)], right = W - m;
  x.fillStyle = d.accent; x.fillRect(m, y, right - m, P(70)); x.fillStyle = "#fff"; fs(32, 700); ["#", L("विवरण", "Item"), L("मात्रा", "Qty"), L("दर", "Rate"), "GST", L("रकम", "Amount")].forEach((t, i) => { x.textAlign = i > 1 ? "right" : "left"; x.fillText(t, i > 1 ? (cols[i + 1] || right) - P(10) : cols[i] + P(10), y + P(47)); });
  y += P(70); fs(32); c.rows.slice(0, 14).forEach((r, i) => { x.fillStyle = i % 2 ? "#f3f4f6" : "#fff"; x.fillRect(m, y, right - m, P(72)); x.fillStyle = "#111"; x.textAlign = "left"; x.fillText(String(i + 1), cols[0] + P(10), y + P(48)); x.fillText(r.desc, cols[1] + P(10), y + P(48), P(880));
    x.textAlign = "right"; x.fillText(String(r.q), cols[3] - P(10), y + P(48)); x.fillText(money(Math.round(r.base / (r.q || 1))), cols[4] - P(10), y + P(48)); x.fillText(r.g + "%", cols[5] - P(10), y + P(48)); x.fillText(money(r.total), right - P(10), y + P(48)); y += P(72); });
  y += P(40); x.textAlign = "right"; const line = (a, b, bold) => { fs(bold ? 44 : 34, bold ? 800 : 500); x.fillStyle = bold ? d.accent : "#111"; x.fillText(a, right - P(420), y); x.fillText(b, right, y); y += P(bold ? 80 : 56); };
  line(L("उप-कुल", "Subtotal"), money(c.sub)); if (d.inter) line("IGST", money(c.igst)); else { line("CGST", money(c.cgst)); line("SGST", money(c.sgst)); } if (c.round) line(L("राउंड ऑफ़", "Round off"), (c.round < 0 ? "-" : "") + money(Math.abs(c.round))); line(L("कुल रकम ₹", "Grand total ₹"), money(c.grand), true);
  const w = rupeesInWords(String(c.grand / 100)); x.textAlign = "left"; x.fillStyle = "#374151"; fs(32); if (w) { x.fillText(w.hi, m, y - P(10), P(1300)); x.fillText(w.en, m, y + P(40), P(1300)); }
  x.fillStyle = "#6b7280"; fs(30); x.textAlign = "center"; x.fillText(d.note, W / 2, H - P(120)); return cv;
}

// ---- PDF stamp: text watermark (Hindi OK) or image/signature on every page
export function pdfStamp(loadLib, readBuf) {
  let file = null, mode = "text", text = "गोपनीय / CONFIDENTIAL", size = 8, opacity = 25, angle = 35, pos = "center", img = null, color = "#b91c1c"; const info = h("small");
  const go = h("button.primary", icon("download", 16), "PDF");
  go.onclick = async () => {
    if (!file) return toast(L("पहले PDF चुनिए", "Choose a PDF first"), "err"); go.disabled = true;
    try {
      await fontsReady(); const { PDFDocument, degrees } = await loadLib(), doc = await PDFDocument.load(await readBuf(file), { ignoreEncryption: true });
      let src; if (mode === "text") { const c = document.createElement("canvas"), x = c.getContext("2d"), fp = 160; x.font = `700 ${fp}px ${FONT}`; const tw = Math.ceil(x.measureText(text).width) + 40; c.width = tw; c.height = fp * 1.5; x.font = `700 ${fp}px ${FONT}`; x.fillStyle = color; x.textBaseline = "middle"; x.fillText(text, 20, c.height / 2); src = c; } else { if (!img) throw new Error(L("पहले इमेज चुनिए", "Choose an image first")); src = img; }
      const png = await new Promise((r) => { const c = document.createElement("canvas"); c.width = src.width; c.height = src.height; c.getContext("2d").drawImage(src, 0, 0); c.toBlob(async (b) => r(new Uint8Array(await b.arrayBuffer())), "image/png"); });
      const emb = await doc.embedPng(png);
      for (const p of doc.getPages()) { const { width, height } = p.getSize(), tw = width * (size / 10) * (mode === "text" ? 0.9 : 0.5) , th = tw * (emb.height / emb.width), rad = (angle * Math.PI) / 180, a = mode === "text" && pos === "center" ? angle : 0;
        let cx = width / 2, cy = height / 2; if (pos === "br") { cx = width - tw / 2 - 30; cy = th / 2 + 30; } if (pos === "tl") { cx = tw / 2 + 30; cy = height - th / 2 - 30; }
        const ar = (a * Math.PI) / 180; p.drawImage(emb, { x: cx - (tw / 2) * Math.cos(ar) + (th / 2) * Math.sin(ar), y: cy - (tw / 2) * Math.sin(ar) - (th / 2) * Math.cos(ar), width: tw, height: th, rotate: degrees(a), opacity: opacity / 100 }); void rad; }
      downloadBlob(file.name.replace(/\.pdf$/i, "") + "-stamped.pdf", new Blob([await doc.save()], { type: "application/pdf" })); toast(L("हो गया", "Done"));
    } catch (e) { console.error(e); toast(L("कुछ गड़बड़ हुई", "Something went wrong") + (e?.message ? ": " + e.message : ""), "err"); } finally { go.disabled = false; }
  };
  return h("div.form", note(L("हर पेज पर वॉटरमार्क (हिंदी चलेगा) या अपने साइन/मुहर की फ़ोटो लगाइए।", "Put a watermark (Hindi works) or your signature/stamp image on every page.")),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("application/pdf,.pdf", (f) => { file = f; info.textContent = f.name; }) }, icon("plus", 16), L("PDF चुनिए", "Choose PDF")), info),
    h("div.grid2", field(L("प्रकार", "Type"), sel([["text", L("टेक्स्ट", "Text")], ["image", L("साइन / मुहर इमेज", "Signature / stamp image")]], mode, (v) => { mode = v; })),
      field(L("टेक्स्ट", "Text"), textIn(text, (v) => { text = v; })), field(L("जगह", "Position"), sel([["center", L("बीच में तिरछा", "Centre")], ["br", L("नीचे दाएँ", "Bottom right")], ["tl", L("ऊपर बाएँ", "Top left")]], pos, (v) => { pos = v; })),
      field(L("साइज़", "Size"), h("input", { type: "range", min: 2, max: 10, value: size, oninput: (e) => { size = +e.target.value; } })), field(L("पारदर्शिता", "Opacity"), h("input", { type: "range", min: 5, max: 100, value: opacity, oninput: (e) => { opacity = +e.target.value; } })),
      field(L("रंग", "Colour"), h("input", { type: "color", value: color, oninput: (e) => { color = e.target.value; } }))),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { img = await loadImg(f); toast(f.name); }) }, icon("image", 16), L("इमेज चुनिए", "Choose image")), go));
}

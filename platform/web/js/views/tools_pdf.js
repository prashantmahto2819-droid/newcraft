import { h, icon, toast, downloadBlob } from "../ui.js";
import { bytes } from "../i18n.js";
import { jpegsToPdf, canvasJpeg } from "../tools/pdf.js";
import { makeZip } from "../tools/zip.js";
import { pickFiles } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

const V = (p) => new URL("../../vendor/" + p, import.meta.url).href;
let libP, jsP;
const loadLib = () => (libP ??= new Promise((res, rej) => { if (window.PDFLib) return res(window.PDFLib); const s = document.createElement("script"); s.src = V("pdf-lib.min.js"); s.onload = () => res(window.PDFLib); s.onerror = () => rej(new Error("pdf-lib")); document.head.append(s); }));
const loadJs = () => (jsP ??= import(V("pdfjs/pdf.min.mjs")).then((m) => { m.GlobalWorkerOptions.workerSrc = V("pdfjs/pdf.worker.min.mjs"); return m; }));
const openJs = async (buf) => { const m = await loadJs(); return m.getDocument({ data: buf.slice(0), standardFontDataUrl: V("pdfjs/standard_fonts/"), cMapUrl: V("pdfjs/cmaps/"), cMapPacked: true, wasmUrl: V("pdfjs/wasm/"), iccUrl: V("pdfjs/iccs/") }).promise; };
const readBuf = async (f) => new Uint8Array(await f.arrayBuffer());
const busy = (btn, fn) => async () => { btn.disabled = true; const t = btn.textContent; try { await fn(); } catch (e) { console.error(e); toast(L("कुछ गड़बड़ हुई", "Something went wrong") + (e?.message ? ": " + e.message : ""), "err"); } finally { btn.disabled = false; btn.textContent = t; } };
export function parseRanges(txt, n) { // "1-3,5,8-" -> sorted unique 0-based indices
  const out = new Set(); for (const part of txt.split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = /^(\d*)\s*-\s*(\d*)$/.exec(part) || /^(\d+)$/.exec(part); if (!m) throw new Error(L("गलत पेज रेंज: ", "Bad page range: ") + part);
    let a = m[2] === undefined ? +m[1] : m[1] === "" ? 1 : +m[1], b = m[2] === undefined ? +m[1] : m[2] === "" ? n : +m[2];
    if (a < 1 || b > n || a > b) throw new Error(L("पेज सीमा से बाहर: ", "Out of range: ") + part); for (let i = a; i <= b; i++) out.add(i - 1); }
  return [...out].sort((x, y) => x - y);
}
const pdfName = (f, tag) => f.name.replace(/\.pdf$/i, "") + "-" + tag + ".pdf";

// ---- Merge
export function pdfMerge() {
  let files = []; const lst = h("div.rows");
  const draw = () => { lst.textContent = ""; files.forEach((f, i) => lst.append(h("div.row", h("div.grow", h("b", f.name), h("small", bytes(f.size))), h("button.icon-btn", { "aria-label": "up", disabled: !i, onclick: () => { [files[i - 1], files[i]] = [files[i], files[i - 1]]; draw(); } }, "↑"), h("button.icon-btn", { "aria-label": "remove", onclick: () => { files.splice(i, 1); draw(); } }, icon("x", 16))))); };
  const go = h("button.primary", icon("download", 16), "PDF");
  go.onclick = busy(go, async () => {
    if (files.length < 2) return toast(L("कम से कम 2 PDF जोड़िए", "Add at least 2 PDFs"), "err");
    const { PDFDocument } = await loadLib(), out = await PDFDocument.create();
    for (const f of files) { const src = await PDFDocument.load(await readBuf(f), { ignoreEncryption: true }); (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p)); }
    downloadBlob("merged.pdf", new Blob([await out.save()], { type: "application/pdf" })); toast(`${out.getPageCount()} ${L("पेज जुड़े", "pages merged")}`);
  });
  return h("div.form", note(L("कई PDF को एक में जोड़िए। क्रम ऊपर-नीचे बदल सकते हैं। फ़ाइल आपके ब्राउज़र से बाहर नहीं जाती।", "Combine PDFs into one. Reorder with the arrows. Files never leave your browser.")),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFiles("application/pdf,.pdf", (f) => { files.push(...f); draw(); }) }, icon("plus", 16), L("PDF जोड़िए", "Add PDFs")), go), lst);
}

// ---- Organise: extract / delete / rotate / split / page numbers
export function pdfOrganize() {
  let file = null, n = 0, act = "extract", range = "", rot = 90, nums = false; const info = h("small");
  const go = h("button.primary", icon("download", 16), L("बनाइए", "Create"));
  const pick = () => pickFiles("application/pdf,.pdf", async (fs) => { file = fs[0]; try { const { PDFDocument } = await loadLib(); n = (await PDFDocument.load(await readBuf(file), { ignoreEncryption: true })).getPageCount(); info.textContent = `${file.name} · ${n} ${L("पेज", "pages")} · ${bytes(file.size)}`; } catch { file = null; info.textContent = ""; toast(L("यह PDF नहीं खुली", "Could not open this PDF"), "err"); } });
  go.onclick = busy(go, async () => {
    if (!file) return toast(L("पहले PDF चुनिए", "Choose a PDF first"), "err");
    const lib = await loadLib(), { PDFDocument, StandardFonts, rgb, degrees } = lib, src = await PDFDocument.load(await readBuf(file), { ignoreEncryption: true });
    if (act === "split") { const files = []; for (let i = 0; i < n; i++) { const d = await PDFDocument.create(); d.addPage((await d.copyPages(src, [i]))[0]); files.push({ name: `page-${String(i + 1).padStart(3, "0")}.pdf`, data: await d.save() }); } return downloadBlob(file.name.replace(/\.pdf$/i, "") + "-pages.zip", makeZip(files)); }
    const idx = parseRanges(range || `1-${n}`, n); let keep = idx;
    if (act === "delete") { const del = new Set(idx); keep = [...Array(n).keys()].filter((i) => !del.has(i)); if (!keep.length) throw new Error(L("सारे पेज हट जाएँगे", "That would remove every page")); }
    let out;
    if (act === "rotate") { out = src; idx.forEach((i) => { const p = out.getPage(i); p.setRotation(degrees((p.getRotation().angle + rot) % 360)); }); }
    else { out = await PDFDocument.create(); (await out.copyPages(src, keep)).forEach((p) => out.addPage(p)); }
    if (nums) { const font = await out.embedFont(StandardFonts.Helvetica), pages = out.getPages(); pages.forEach((p, i) => { const { width } = p.getSize(), t = `${i + 1} / ${pages.length}`; p.drawText(t, { x: width / 2 - font.widthOfTextAtSize(t, 10) / 2, y: 18, size: 10, font, color: rgb(0.2, 0.2, 0.2) }); }); }
    downloadBlob(pdfName(file, act), new Blob([await out.save()], { type: "application/pdf" })); toast(L("तैयार", "Done"));
  });
  return h("div.form", note(L("PDF से पेज निकालिए, हटाइए, घुमाइए, हर पेज अलग (ZIP) कीजिए या पेज नंबर डालिए। रेंज ऐसे लिखें: 1-3,5,8-", "Extract, delete or rotate pages, split every page (ZIP) or add page numbers. Ranges like: 1-3,5,8-")),
    h("button.ghost", { onclick: pick }, icon("upload", 16), L("PDF चुनिए", "Choose PDF")), info,
    h("div.grid2", field(L("क्या करना है", "Action"), sel([["extract", L("चुने पेज निकालें", "Extract pages")], ["delete", L("चुने पेज हटाएँ", "Delete pages")], ["rotate", L("चुने पेज घुमाएँ", "Rotate pages")], ["split", L("हर पेज अलग (ZIP)", "Split every page (ZIP)")]], act, (v) => (act = v))), field(L("पेज रेंज (खाली = सारे)", "Pages (empty = all)"), textIn("", (v) => (range = v), { placeholder: "1-3,5,8-" })),
      field(L("घुमाव (सिर्फ़ रोटेट में)", "Rotation (rotate only)"), sel([[90, "90°"], [180, "180°"], [270, "270°"]], rot, (v) => (rot = +v)))),
    h("label.chk", h("input", { type: "checkbox", onchange: (e) => (nums = e.target.checked) }), L("पेज नंबर जोड़ें (नीचे बीच में)", "Add page numbers (bottom centre)")), go);
}

// ---- Compress
export function pdfCompress() {
  let file = null, mode = "light", dpi = 110, q = 60; const res = h("div.rows"), info = h("small");
  const go = h("button.primary", icon("download", 16), L("छोटी करें", "Compress"));
  go.onclick = busy(go, async () => {
    if (!file) return toast(L("पहले PDF चुनिए", "Choose a PDF first"), "err"); res.textContent = ""; let blob;
    if (mode === "light") { const { PDFDocument } = await loadLib(), d = await PDFDocument.load(await readBuf(file), { ignoreEncryption: true }); blob = new Blob([await d.save({ useObjectStreams: true })], { type: "application/pdf" }); }
    else { const doc = await openJs(await readBuf(file)), pages = []; for (let i = 1; i <= doc.numPages; i++) { go.textContent = `${i}/${doc.numPages}`; const pg = await doc.getPage(i), base = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: dpi / 72 }), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, viewport: vp }).promise; pages.push({ jpeg: await canvasJpeg(c, q / 100), w: c.width, h: c.height, pw: base.width, ph: base.height, x: 0, y: 0, iw: base.width, ih: base.height }); } blob = jpegsToPdf(pages); }
    const better = blob.size < file.size; res.append(h("div.row", h("div.grow", h("b", pdfName(file, "small")), h("small", `${bytes(file.size)} → ${bytes(blob.size)}` + (better ? ` (−${Math.round((1 - blob.size / file.size) * 100)}%)` : L(" · पहले से ही छोटी है", " · already optimal")))), h("button.ghost", { onclick: () => downloadBlob(pdfName(file, "small"), blob) }, icon("download", 16))));
  });
  return h("div.form", note(L("हल्का: बस ढाँचा साफ़ करता है (टेक्स्ट वैसा ही रहता है)। तगड़ा: हर पेज को फ़ोटो बनाकर छोटा करता है (स्कैन वाली भारी PDF के लिए, पर टेक्स्ट चुनना/खोजना बंद हो जाता है)।", "Light: tidies structure (text stays). Strong: rebuilds each page as a photo (good for heavy scans; text becomes unselectable).")),
    h("button.ghost", { onclick: () => pickFiles("application/pdf,.pdf", (f) => { file = f[0]; info.textContent = `${file.name} · ${bytes(file.size)}`; res.textContent = ""; }) }, icon("upload", 16), L("PDF चुनिए", "Choose PDF")), info,
    h("div.grid2", field(L("तरीका", "Mode"), sel([["light", L("हल्का (टेक्स्ट बना रहता है)", "Light (keeps text)")], ["strong", L("तगड़ा (पेज → फ़ोटो)", "Strong (pages → images)")]], mode, (v) => (mode = v))), field(L("तगड़ा: DPI", "Strong: DPI"), sel([[72, "72"], [110, "110"], [150, "150"]], dpi, (v) => (dpi = +v))), field(L("तगड़ा: क्वालिटी %", "Strong: quality %"), h("input", { type: "number", value: q, min: 10, max: 95, onchange: (e) => (q = Math.min(95, Math.max(10, +e.target.value || 60))) }))), go, res);
}

// ---- PDF -> images
export function pdfToImages() {
  let file = null, fmt = "image/png", dpi = 150, range = ""; const info = h("small"); const go = h("button.primary", icon("download", 16), L("फ़ोटो बनाइए", "Convert"));
  go.onclick = busy(go, async () => {
    if (!file) return toast(L("पहले PDF चुनिए", "Choose a PDF first"), "err"); const doc = await openJs(await readBuf(file)), idx = parseRanges(range || `1-${doc.numPages}`, doc.numPages), out = [], ext = fmt === "image/png" ? "png" : "jpg";
    for (const i of idx) { go.textContent = `${out.length + 1}/${idx.length}`; const pg = await doc.getPage(i + 1), vp = pg.getViewport({ scale: dpi / 72 }), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, viewport: vp }).promise; const b = await new Promise((r) => c.toBlob(r, fmt, 0.92)); out.push({ name: `page-${String(i + 1).padStart(3, "0")}.${ext}`, data: new Uint8Array(await b.arrayBuffer()), blob: b }); }
    out.length === 1 ? downloadBlob(out[0].name, out[0].blob) : downloadBlob(file.name.replace(/\.pdf$/i, "") + "-images.zip", makeZip(out)); toast(`${out.length} ${L("पेज", "pages")}`);
  });
  return h("div.form", note(L("PDF के पेज PNG/JPG फ़ोटो में बदलिए (एक पेज हो तो सीधी फ़ोटो, ज़्यादा हों तो ZIP)।", "Turn PDF pages into PNG/JPG (single image, or a ZIP for many pages).")),
    h("button.ghost", { onclick: () => pickFiles("application/pdf,.pdf", async (f) => { file = f[0]; try { const d = await openJs(await readBuf(file)); info.textContent = `${file.name} · ${d.numPages} ${L("पेज", "pages")}`; } catch { info.textContent = ""; toast(L("यह PDF नहीं खुली", "Could not open this PDF"), "err"); } }) }, icon("upload", 16), L("PDF चुनिए", "Choose PDF")), info,
    h("div.grid2", field(L("फ़ॉर्मैट", "Format"), sel([["image/png", "PNG"], ["image/jpeg", "JPG"]], fmt, (v) => (fmt = v))), field("DPI", sel([[72, "72"], [150, "150"], [200, "200"], [300, "300"]], dpi, (v) => (dpi = +v))), field(L("पेज रेंज (खाली = सारे)", "Pages (empty = all)"), textIn("", (v) => (range = v), { placeholder: "1-3,5" }))), go);
}

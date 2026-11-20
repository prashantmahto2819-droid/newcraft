import { h, icon, toast, downloadBlob } from "../ui.js";
import { pickFile } from "./shared.js";
import { L, field, note, sel } from "./tools_img.js";
import { openJs, readBuf } from "./tools_pdf.js";

const SIMD = () => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch { return false; } };
let worker = null, waiting = null, cur = "", jobN = 0, onProg = () => {};
function call(msg, transfer = []) {
  return new Promise((res, rej) => { waiting = { res, rej }; worker.postMessage(msg, transfer); });
}
async function ensure(langs) {
  if (!worker) {
    worker = new Worker(new URL("../../vendor/ocr/ocr-worker.js", import.meta.url));
    worker.onmessage = (e) => { const m = e.data; if (m.type === "progress") onProg(m.p); else if (m.type === "error") waiting?.rej(new Error(m.message)); else waiting?.res(m); };
    worker.onerror = (e) => waiting?.rej(new Error(e.message || "worker"));
  }
  if (cur !== langs) { await call({ type: "init", langs: langs.split("+"), simd: SIMD() }); cur = langs; }
}
export const ocrPng = async (png, langs, psm = "3") => { await ensure(langs); const buf = png.slice().buffer; return (await call({ type: "ocr", png: buf, psm, job: ++jobN }, [buf])).text; };

// Make an image OCR-friendly: white background, grey, at least ~2000 px on the long side.
async function prep(src) {
  const sc = Math.max(1, Math.min(3, 2000 / Math.max(src.width, src.height))), c = document.createElement("canvas"); c.width = Math.round(src.width * sc); c.height = Math.round(src.height * sc);
  const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height);
  return new Uint8Array(await new Promise((r) => c.toBlob(async (b) => r(await b.arrayBuffer()), "image/png")));
}

export function ocrTool() {
  let file = null, langs = "hin+eng", psm = "3"; const info = h("small"), bar = h("progress", { max: 1, value: 0, style: { width: "100%", display: "none" } }), out = h("div.rows"), stat = h("small");
  const go = h("button.primary", icon("wand", 16), L("टेक्स्ट निकालिए", "Extract text"));
  let pages = [];
  const show = () => { out.textContent = ""; pages.forEach((t, i) => out.append(field(pages.length > 1 ? `${L("पेज", "Page")} ${i + 1}` : L("टेक्स्ट", "Text"), h("textarea", { rows: 8, value: t, oninput: (e) => { pages[i] = e.target.value; } })))); };
  go.onclick = async () => {
    if (!file) return toast(L("पहले फ़ोटो या PDF चुनिए", "Choose an image or PDF first"), "err");
    go.disabled = true; bar.style.display = ""; pages = []; show();
    try {
      const imgs = []; // functions returning a canvas-ready source, lazily
      if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
        const doc = await openJs(await readBuf(file)); if (doc.numPages > 40) throw new Error(L("एक बार में 40 पेज तक", "Up to 40 pages at a time"));
        for (let i = 1; i <= doc.numPages; i++) imgs.push(async () => { const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2.8 }), c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, viewport: vp }).promise; return c; });
      } else { const bmp = await createImageBitmap(file); imgs.push(async () => bmp); }
      stat.textContent = L("भाषा-डेटा लोड हो रहा है…", "Loading language data…"); await ensure(langs);
      for (let i = 0; i < imgs.length; i++) {
        stat.textContent = `${L("पेज", "Page")} ${i + 1}/${imgs.length}`; bar.value = 0; onProg = (p) => { bar.value = p; };
        pages.push((await ocrPng(await prep(await imgs[i]()), langs, psm)).trim()); show();
      }
      stat.textContent = L("हो गया — गलतियाँ खुद ठीक कर सकते हैं।", "Done — you can fix mistakes in the boxes.");
    } catch (e) { console.error(e); toast(L("कुछ गड़बड़ हुई", "Something went wrong") + (e?.message ? ": " + e.message : ""), "err"); stat.textContent = ""; } finally { go.disabled = false; bar.style.display = "none"; }
  };
  return h("div.form", note(L("फ़ोटो या स्कैन PDF से हिंदी + अंग्रेज़ी टेक्स्ट निकालिए। सब कुछ आपके ब्राउज़र में चलता है, फ़ाइल कहीं नहीं जाती। पहली बार थोड़ा समय लगता है।", "Extract Hindi + English text from a photo or scanned PDF. Runs fully in your browser; nothing is uploaded. The first run takes a moment.")),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*,application/pdf,.pdf", (f) => { file = f; info.textContent = f.name; }) }, icon("upload", 16), L("फ़ोटो / PDF चुनिए", "Choose image / PDF")), info),
    h("div.grid2", field(L("भाषा", "Language"), sel([["hin+eng", L("हिंदी + English", "Hindi + English")], ["hin", "हिंदी"], ["eng", "English"]], langs, (v) => { langs = v; })),
      field(L("लेआउट", "Layout"), sel([["3", L("अपने आप", "Automatic")], ["6", L("एक ब्लॉक", "Single block")], ["4", L("एक कॉलम", "Single column")], ["7", L("एक लाइन", "Single line")]], psm, (v) => { psm = v; }))),
    h("div.btnrow", go, h("button.ghost", { onclick: () => { const t = pages.join("\n\n"); if (t.trim()) downloadBlob("ocr.txt", new Blob([t], { type: "text/plain;charset=utf-8" })); } }, icon("download", 16), "TXT"),
      h("button.ghost", { onclick: async () => { try { await navigator.clipboard.writeText(pages.join("\n\n")); toast(L("कॉपी हो गया", "Copied")); } catch { toast(L("कॉपी नहीं हुआ", "Copy failed"), "err"); } } }, icon("copy", 16), L("कॉपी", "Copy"))), bar, stat, out);
}

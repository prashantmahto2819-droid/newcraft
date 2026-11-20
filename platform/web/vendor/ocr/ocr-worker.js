// Tulika OCR worker (our own glue, MIT/Apache-compatible) over tesseract.js-core 7.0.0 (Apache-2.0). Models: tessdata_fast (Apache-2.0).
// Messages in : {type:"init", langs:["hin","eng"], simd:true}  |  {type:"ocr", png:ArrayBuffer, psm:"3"}
// Messages out: {type:"ready"} | {type:"progress", p} | {type:"text", text} | {type:"error", message}
let mod = null, api = null, langsKey = "", job = 0;
const here = self.location.href.replace(/[^/]*$/, "");
async function init(langs, simd) {
  if (!mod) {
    importScripts(here + (simd ? "tesseract-core-simd-lstm.wasm.js" : "tesseract-core-lstm.wasm.js"));
    mod = await self.TesseractCore({ TesseractProgress: (p) => postMessage({ type: "progress", job, p: Math.max(0, (p - 30) / 70) }) });
  }
  const key = langs.join("+");
  if (api && key === langsKey) return;
  for (const l of langs) { const r = await fetch(here + l + ".traineddata"); if (!r.ok) throw new Error("missing " + l); mod.FS.writeFile("./" + l + ".traineddata", new Uint8Array(await r.arrayBuffer())); }
  if (api) api.End();
  api = new mod.TessBaseAPI();
  if (api.Init(null, key, 1 /* LSTM only */, undefined) === -1) throw new Error("tesseract init failed");
  langsKey = key;
}
onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === "init") { await init(m.langs, m.simd); postMessage({ type: "ready" }); }
    else if (m.type === "ocr") {
      job = m.job; api.SetVariable("tessedit_pageseg_mode", String(m.psm || "3"));
      mod.FS.writeFile("/input", new Uint8Array(m.png)); if (api.SetImageFile(1, 0) === 1) throw new Error("bad image");
      api.Recognize(null); postMessage({ type: "text", job, text: api.GetUTF8Text() });
    }
  } catch (err) { postMessage({ type: "error", job, message: String(err && err.message || err) }); }
};

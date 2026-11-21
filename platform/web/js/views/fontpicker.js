// Font picker: search + script / style filters + live preview of each font (loaded lazily as rows scroll into view).
import { h, modal } from "../ui.js";
import { getLang } from "../i18n.js";
import { ALL_FONTS, SCRIPTS, CAT_LABELS, loadFontCss, fontNote } from "../data/fonts_all.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);

export function pickFont(current, onpick, sample) {
  loadFontCss();
  let script = "all", cat = "all", q = "";
  const text = sample || L("नमस्ते भारत Aa 123", "Hello Aa 123 नमस्ते");
  const list = h("div.fplist"); const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.style.fontFamily = `"${e.target.dataset.f}", "Noto Sans Devanagari", sans-serif`; io.unobserve(e.target); } }, { root: list, rootMargin: "120px" });
  const chips = h("div.chips"), chips2 = h("div.chips");
  const draw = () => {
    io.disconnect(); list.textContent = "";
    const s = q.trim().toLowerCase();
    const items = ALL_FONTS.filter((f) => (script === "all" || f.script === script) && (cat === "all" || f.cat === cat) && (!s || f.family.toLowerCase().includes(s)));
    for (const f of items) {
      const sample = h("div.fpsample", { "data-f": f.family, style: { fontWeight: f.weight || 700 } }, text);
      list.append(h("button.fprow" + (f.family === current ? ".on" : ""), { type: "button", onclick: () => { onpick(f.family); document.querySelector(".backdrop")?.remove(); } }, h("small", `${f.family} · ${fontNote(f, getLang() === "hi")} · ${L(...(SCRIPTS[f.script] || ["", ""]))}`), sample));
      io.observe(sample);
    }
    if (!items.length) list.append(h("div.empty", L("कोई फ़ॉन्ट नहीं मिला", "No fonts found")));
    count.textContent = `${items.length} / ${ALL_FONTS.length}`;
  };
  const count = h("small");
  const drawChips = () => {
    chips.textContent = ""; chips2.textContent = "";
    for (const k of ["all", ...Object.keys(SCRIPTS)]) chips.append(h("button.chip" + (script === k ? ".on" : ""), { type: "button", onclick: () => { script = k; drawChips(); draw(); } }, k === "all" ? L("सभी भाषाएँ", "All scripts") : L(...SCRIPTS[k])));
    for (const k of ["all", ...Object.keys(CAT_LABELS)]) chips2.append(h("button.chip" + (cat === k ? ".on" : ""), { type: "button", onclick: () => { cat = k; drawChips(); draw(); } }, k === "all" ? L("सभी शैलियाँ", "All styles") : L(...CAT_LABELS[k])));
  };
  drawChips(); draw();
  modal({ title: L("फ़ॉन्ट चुनिए", "Choose a font"), wide: true, body: h("div.form", h("input", { type: "search", placeholder: L("फ़ॉन्ट खोजिए…", "Search fonts…"), oninput: (e) => { q = e.target.value; draw(); }, "aria-label": "search" }), chips, chips2, count, list), actions: [{ label: L("बंद करें", "Close") }] });
}

// a small button that shows the current font and opens the picker
export function fontButton(current, onchange, sample) {
  const b = h("button.ghost.fontbtn", { type: "button", onclick: () => pickFont(current, (f) => { current = f; b.textContent = f; b.style.fontFamily = `"${f}", sans-serif`; onchange(f); }, sample) }, current);
  loadFontCss(); b.style.fontFamily = `"${current}", sans-serif`; return b;
}

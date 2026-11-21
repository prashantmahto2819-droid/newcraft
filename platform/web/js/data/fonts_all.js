// Every font the dashboard can use. All are SIL OFL, served from our own origin (vendor/fonts/…) and downloaded only when used.
import { DECO_FONTS } from "./deco_fonts.js";
import { MORE_FONTS } from "./fonts_more.js";
import { getLang } from "../i18n.js";

export const SCRIPTS = { hi: ["देवनागरी (हिंदी)", "Devanagari (Hindi)"], en: ["अंग्रेज़ी", "English / Latin"], gu: ["गुजराती", "Gujarati"], bn: ["बंगाली", "Bengali"], ta: ["तमिल", "Tamil"], te: ["तेलुगु", "Telugu"] };
export const CAT_LABELS = { sans: ["सादा", "Sans"], serif: ["सेरिफ़", "Serif"], display: ["मोटा / सजावटी", "Display"], script: ["हस्तलिखित", "Script"], deco: ["सजावटी हिंदी", "Decorative Hindi"] };

export const ALL_FONTS = [
  { family: "Noto Sans Devanagari", script: "hi", cat: "sans", bold: true },
  ...DECO_FONTS.map((f) => ({ family: f.family, script: "hi", cat: "deco", bold: false, weight: f.weight, note: f.kind })),
  ...MORE_FONTS.filter((f) => !DECO_FONTS.some((d) => d.family === f.family)),
];
export const FAMILIES = ALL_FONTS.map((f) => f.family);
export const fontInfo = (family) => ALL_FONTS.find((f) => f.family === family);


export const fontWeight = (family) => { const f = fontInfo(family); return f?.weight || (f?.bold === false ? 400 : 700); };
export const fontOptions = () => { const hi = getLang() === "hi"; return ALL_FONTS.map((f) => [f.family, `${f.family} — ${fontNote(f, hi)}`]); };

const NOTE_EN = { "आधुनिक": "Modern", "कैलीग्राफ़ी": "Calligraphy", "क्लासिक": "Classic", "गाढ़ा सेरिफ़": "Heavy serif", "त्योहार": "Festive", "पोस्टर": "Poster", "बोल्ड": "Bold", "मोटा मज़ेदार": "Fun heavy", "मोटा सजावटी": "Heavy decorative", "शास्त्रीय": "Classical", "सजावटी": "Decorative", "सादा": "Plain", "सुंदर": "Elegant", "सुलेख": "Penmanship", "स्लैब": "Slab", "हस्तलिखित": "Handwritten" };
export const fontNote = (f, hi) => (f.note ? (hi ? f.note : NOTE_EN[f.note] || f.note) : (CAT_LABELS[f.cat] || ["", ""])[hi ? 0 : 1]);
const loaded = {};
export function loadFontCss() {
  const one = (rel) => (loaded[rel] ??= new Promise((r) => { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = new URL(rel, import.meta.url).href; l.onload = l.onerror = r; document.head.append(l); }));
  return Promise.all([one("../../vendor/fonts/deco/deco.css"), one("../../vendor/fonts/more/more.css")]);
}

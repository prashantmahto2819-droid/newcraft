// Editable template designs. A design is plain JSON: { w, h, unit, bg:[c1,c2,angle], layers:[...] } in a
// 1000-unit-long-side canvas. The same renderer draws the gallery previews, the editor canvas and the exports.
// Layer types: text, rect, circle, ring, poly, path. Fonts: the 22 vendored OFL Devanagari display fonts + Noto.
import { getLang } from "../i18n.js";
import { FAMILIES, loadFontCss } from "./fonts_all.js";

export const CATS = {
  social:   { hi: "सोशल मीडिया", en: "Social media", c: "#e1306c", e: "📱" },
  festival: { hi: "त्योहार और मौक़े", en: "Festivals & occasions", c: "#f97316", e: "🪔" },
  print:    { hi: "प्रिंट", en: "Print", c: "#0ea5e9", e: "🖨️" },
  business: { hi: "बिज़नेस", en: "Business", c: "#6366f1", e: "💼" },
  india:    { hi: "भारतीय ज़रूरतें", en: "India essentials", c: "#16a34a", e: "🇮🇳" },
  video:    { hi: "वीडियो", en: "Video", c: "#8b5cf6", e: "🎬" },
};

// id -> [bg1, bg2, ink, accent, motif, layout, font, hindi headline, english sub]
const S = {
  "ig-post":     ["#ff8a3c", "#ffd86b", "#7c2d12", "#fff", "rays", "poster", "Yatra One", "शुभ प्रभात", "Good morning · have a lovely day"],
  "ig-portrait": ["#1e1b4b", "#6d28d9", "#fff", "#fbbf24", "stars", "poster", "Rozha One", "आपका स्वागत है", "Your message goes here"],
  "story":       ["#be123c", "#f97316", "#fff", "#fde68a", "petals", "poster", "Modak", "शुभ दिन", "Swipe up · स्वाइप करें"],
  "yt-thumb":    ["#111827", "#7c3aed", "#fff", "#facc15", "rings", "thumb", "Teko", "ज़बरदस्त\nखुलासा!", "WATCH NOW"],
  "yt-banner":   ["#0f172a", "#0e7490", "#fff", "#fbbf24", "dots", "banner", "Yatra One", "आपके चैनल का नाम", "नया वीडियो हर शनिवार · New video every Saturday"],
  "fb-cover":    ["#0ea5e9", "#1e3a8a", "#fff", "#fde047", "waves", "banner", "Rozha One", "आपका नाम / संस्था", "आपका संदेश यहाँ"],
  "fb-post":     ["#f43f5e", "#fb923c", "#fff", "#fff7ed", "petals", "poster", "Khand", "बड़ी ख़बर", "आपका संदेश यहाँ"],
  "a4":          ["#ffffff", "#e0f2fe", "#0c4a6e", "#0284c7", "dots", "letter", "Rozha One", "आपका शीर्षक", "A4 page"],
  "a5":          ["#fff7ed", "#fed7aa", "#7c2d12", "#ea580c", "waves", "poster", "Yatra One", "बड़ी छूट!", "सीमित समय के लिए · Limited time offer"],
  "a3":          ["#1e1b4b", "#4c1d95", "#fff", "#fbbf24", "rays", "poster", "Rozha One", "भव्य आयोजन", "दिनांक · स्थान · समय"],
  "a2":          ["#064e3b", "#16a34a", "#fff", "#fde047", "mandala", "poster", "Yatra One", "बड़ा पोस्टर", "आपकी जानकारी यहाँ"],
  "dl":          ["#fef3c7", "#fcd34d", "#78350f", "#b45309", "dots", "poster", "Khand", "ऑफ़र!", "मेनू · दाम · पता"],
  "card":        ["#ffffff", "#f1f5f9", "#0f172a", "#0f766e", "none", "card", "Rozha One", "आपका नाम", "आपका पद · कंपनी"],
  "letterhead":  ["#ffffff", "#f8fafc", "#0f172a", "#7c3aed", "none", "letter", "Rozha One", "आपकी संस्था का नाम", "पता · फ़ोन · ईमेल"],
  "logo":        ["#ffffff", "#ffffff", "#0f172a", "#14b8a6", "none", "logo", "Yatra One", "तूलिका", "आपका स्लोगन"],
  "id-card":     ["#ffffff", "#e0f2fe", "#0f172a", "#0369a1", "none", "idcard", "Rozha One", "नाम यहाँ", "पद / कक्षा"],
  "envelope":    ["#fefce8", "#fde68a", "#713f12", "#b45309", "none", "letter", "Rozha One", "प्रेषक / संस्था", "पता यहाँ"],
  "flex-3x6":    ["#b91c1c", "#f97316", "#fff", "#fde047", "rays", "banner", "Yatra One", "भव्य उद्घाटन", "दिनांक · स्थान · संपर्क 98XXXXXXXX"],
  "flex-4x8":    ["#1d4ed8", "#0ea5e9", "#fff", "#fde047", "dots", "banner", "Rozha One", "आपकी दुकान का नाम", "सारी सेवाएँ एक जगह · संपर्क 98XXXXXXXX"],
  "flex-2x3":    ["#065f46", "#22c55e", "#fff", "#fef08a", "waves", "poster", "Khand", "स्वागत है", "आपकी जानकारी"],
  "wedding":     ["#fff7ed", "#fed7aa", "#7f1d1d", "#b45309", "mandala", "invite", "Rozha One", "शुभ विवाह", "आयुष्मान  ♥  सौभाग्यकांक्षिणी\nदिनांक · स्थान"],
  "shok":        ["#ffffff", "#f1f5f9", "#111827", "#6b7280", "none", "invite", "Amita", "शोक संदेश", "ईश्वर दिवंगत आत्मा को शांति दे\nशोकाकुल परिवार"],
  "stamp":       ["#ffffff", "#ffffff", "#1d4ed8", "#1d4ed8", "none", "stamp", "Rozha One", "आपकी संस्था", "पता · शहर"],
  "sticker":     ["#fde047", "#fb923c", "#7c2d12", "#fff", "dots", "poster", "Modak", "मस्त रहो!", "स्टिकर"],
  "hd":          ["#0f172a", "#312e81", "#fff", "#f472b6", "none", "video", "Khand", "आपका वीडियो", "16:9"],
  "vertical":    ["#0f172a", "#7c2d12", "#fff", "#fb923c", "none", "video", "Khand", "आपकी रील", "9:16"],
  "4k":          ["#022c22", "#0f766e", "#fff", "#5eead4", "none", "video", "Khand", "4K सिनेमा", "3840×2160"],
  // festivals and occasions (photo app, social sizes)
  "diwali":      ["#3b0764", "#be185d", "#fde68a", "#fbbf24", "stars", "poster", "Yatra One", "दीपावली की\nहार्दिक शुभकामनाएँ", "शुभ दीपावली · Happy Diwali"],
  "birthday":    ["#7c3aed", "#ec4899", "#fff", "#fde047", "petals", "poster", "Modak", "जन्मदिन की\nहार्दिक शुभकामनाएँ", "Happy Birthday!"],
  "holi":        ["#db2777", "#f59e0b", "#fff", "#a7f3d0", "dots", "poster", "Modak", "होली की\nशुभकामनाएँ", "रंगों का त्योहार मुबारक"],
  "navratri":    ["#7f1d1d", "#ea580c", "#fef08a", "#fde047", "mandala", "poster", "Amita", "नवरात्रि की\nशुभकामनाएँ", "जय माता दी"],
  "eid":         ["#064e3b", "#0f766e", "#fef9c3", "#fde047", "stars", "poster", "Amita", "ईद मुबारक", "Eid Mubarak"],
  "chhath":      ["#9a3412", "#fbbf24", "#fff", "#fff7ed", "rays", "poster", "Yatra One", "छठ पूजा की\nहार्दिक शुभकामनाएँ", "जय छठी मैया"],
  "republic":    ["#ea580c", "#16a34a", "#fff", "#1d4ed8", "rings", "poster", "Rozha One", "गणतंत्र दिवस\nकी शुभकामनाएँ", "जय हिन्द"],
  "anniv":       ["#881337", "#e11d48", "#fff", "#fecdd3", "petals", "poster", "Amita", "शादी की सालगिरह\nमुबारक हो", "Happy Anniversary"],
  "goodmorning": ["#0ea5e9", "#fde68a", "#0c4a6e", "#fff", "rays", "poster", "Kalam", "सुप्रभात", "आपका दिन शुभ हो"],
  "thanks":      ["#0f766e", "#14b8a6", "#fff", "#fde047", "dots", "poster", "Kalam", "धन्यवाद", "Thank you"],
};
export const FESTIVAL_TEMPLATES = [
  ["diwali", "दीपावली", "Diwali", 1080, 1080], ["birthday", "जन्मदिन", "Birthday", 1080, 1080], ["holi", "होली", "Holi", 1080, 1080],
  ["navratri", "नवरात्रि", "Navratri", 1080, 1350], ["eid", "ईद", "Eid", 1080, 1080], ["chhath", "छठ पूजा", "Chhath Puja", 1080, 1350],
  ["republic", "गणतंत्र / स्वतंत्रता दिवस", "Republic / Independence Day", 1080, 1080], ["anniv", "सालगिरह", "Anniversary", 1080, 1350],
  ["goodmorning", "सुप्रभात (WhatsApp)", "Good morning (WhatsApp)", 1080, 1080], ["thanks", "धन्यवाद", "Thank you", 1080, 1080],
];

export const FONT_LIST = FAMILIES;

let seq = 0; const id = () => "l" + ++seq;
export const hasDesign = (tplId) => !!S[tplId];

const dims = (tp) => { const r = tp.w / tp.h; const L = 1000; return r >= 1 ? [L, Math.round(L / r)] : [Math.round(L * r), L]; };
const fit = (txt, W, base) => { const n = Math.max(...String(txt).split("\n").map((s) => s.length), 1); return Math.round(Math.min(base, (W * 0.88) / (n * 0.6))); };
const T = (text, x, y, size, fill, font, extra = {}) => ({ id: id(), t: "text", text, x, y, size, fill, font, weight: 700, op: 1, rot: 0, ...extra });

function motif(kind, W, H, c) {
  const o = [], add = (l) => o.push({ id: id(), op: 0.14, ...l });
  if (kind === "rings") for (let i = 1; i <= 4; i++) add({ t: "ring", x: W * 0.86, y: H * 0.18, r: 60 * i + H * 0.08, stroke: c, sw: 6 });
  else if (kind === "dots") for (let y = 40; y < H; y += 80) for (let x = 40 + ((y / 80) % 2) * 40; x < W; x += 80) add({ t: "circle", x, y, r: 8, fill: c });
  else if (kind === "rays") for (let i = 0; i < 14; i++) { const a0 = Math.PI + (i * Math.PI) / 14, a1 = a0 + Math.PI / 28, R = Math.max(W, H) * 1.4; add({ t: "poly", points: [[W / 2, H * 0.98], [W / 2 + R * Math.cos(a0), H * 0.98 + R * Math.sin(a0)], [W / 2 + R * Math.cos(a1), H * 0.98 + R * Math.sin(a1)]], fill: c, op: 0.12 }); }
  else if (kind === "stars") { let s = 11; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); for (let i = 0; i < 40; i++) add({ t: "circle", x: r() * W, y: r() * H, r: 2 + r() * 5, fill: c, op: 0.25 + r() * 0.5 }); }
  else if (kind === "petals") { let s = 5; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); for (let i = 0; i < 14; i++) add({ t: "circle", x: r() * W, y: r() * H, r: 24 + r() * 60, fill: c, op: 0.08 + r() * 0.1 }); }
  else if (kind === "mandala") for (let k = 1; k <= 5; k++) { add({ t: "ring", x: W / 2, y: H / 2, r: k * Math.min(W, H) * 0.1, stroke: c, sw: 3 }); for (let i = 0; i < 8 + k * 2; i++) { const a = (i * 2 * Math.PI) / (8 + k * 2); add({ t: "circle", x: W / 2 + Math.cos(a) * k * Math.min(W, H) * 0.1, y: H / 2 + Math.sin(a) * k * Math.min(W, H) * 0.1, r: 9, fill: c }); } }
  else if (kind === "waves") for (let i = 0; i < 3; i++) add({ t: "path", d: `M0 ${H * (0.7 + i * 0.09)} Q ${W * 0.25} ${H * (0.62 + i * 0.09)} ${W * 0.5} ${H * (0.7 + i * 0.09)} T ${W} ${H * (0.7 + i * 0.09)} V ${H} H 0 Z`, fill: c, op: 0.1 + i * 0.05 });
  return o;
}

export function buildDesign(tp) {
  seq = 0;
  const [W, H] = dims(tp);
  const hasHi = getLang() === "hi";
  const [b1, b2, ink, acc, mo, lay, font, head, sub] = S[tp.id] || ["#ffffff", "#e2e8f0", "#0f172a", "#14b8a6", "dots", "poster", "Yatra One", tp.hi, tp.en];
  const L = motif(mo, W, H, lay === "poster" || lay === "banner" || lay === "thumb" ? ink : acc);
  const bar = (x, y, w, h, fill, op = 1, rx = 0) => ({ id: id(), t: "rect", x, y, w, h, fill, op, rx });
  const base = Math.min(W, H);
  if (lay === "poster") {
    L.push(bar(W * 0.35, H * 0.14, W * 0.3, 8, acc, 1, 4));
    L.push(T(head, W / 2, H * 0.46, fit(head, W, base * 0.16), ink, font, { lh: 1.2 }));
    L.push(bar(W * 0.4, H * 0.7, W * 0.2, 6, acc, 1, 3));
    L.push(T(sub, W / 2, H * 0.8, fit(sub, W, base * 0.05), ink, "Noto Sans Devanagari", { weight: 500, op: 0.9 }));
  } else if (lay === "thumb") {
    L.push({ id: id(), t: "circle", x: W * 0.76, y: H * 0.5, r: H * 0.38, fill: acc, op: 0.9 });
    L.push(T(head, W * 0.34, H * 0.46, fit(head, W * 0.62, base * 0.26), ink, font, { lh: 1.05, stroke: "#000", sw: 6 }));
    L.push(bar(W * 0.06, H * 0.8, W * 0.26, H * 0.1, "#dc2626", 1, 14)); L.push(T(sub, W * 0.19, H * 0.855, H * 0.06, "#fff", "Teko", {}));
  } else if (lay === "banner") {
    L.push(bar(0, H * 0.82, W, H * 0.18, "#000", 0.28));
    L.push(T(head, W / 2, H * 0.4, fit(head, W, H * 0.34), ink, font, { lh: 1.1 }));
    L.push(T(sub, W / 2, H * 0.91, fit(sub, W, H * 0.1), acc, "Noto Sans Devanagari", { weight: 700 }));
  } else if (lay === "card") {
    L.push(bar(0, 0, W * 0.04, H, acc)); L.push({ id: id(), t: "circle", x: W * 0.84, y: H * 0.3, r: H * 0.17, fill: acc, op: 1 });
    L.push(T(head, W * 0.07, H * 0.3, H * 0.15, ink, font, { anchor: "start" }));
    L.push(T(sub, W * 0.07, H * 0.46, H * 0.07, ink, "Noto Sans Devanagari", { anchor: "start", weight: 500, op: 0.75 }));
    L.push(T("📞 98XXXXXXXX\n✉ aap@email.com\n📍 आपका पता, शहर", W * 0.07, H * 0.64, H * 0.065, ink, "Noto Sans Devanagari", { anchor: "start", weight: 500, lh: 1.5 }));
  } else if (lay === "letter") {
    L.push(bar(0, 0, W, H * 0.16, acc)); L.push(T(head, W / 2, H * 0.085, fit(head, W, H * 0.06), "#fff", font, {}));
    for (let i = 0; i < 9; i++) L.push(bar(W * 0.1, H * (0.28 + i * 0.07), W * (i % 4 === 3 ? 0.5 : 0.8), 6, ink, 0.15, 3));
    L.push(bar(0, H * 0.93, W, H * 0.07, acc, 0.9)); L.push(T(sub, W / 2, H * 0.965, H * 0.025, "#fff", "Noto Sans Devanagari", { weight: 500 }));
  } else if (lay === "idcard") {
    L.push(bar(0, 0, W, H * 0.2, acc)); L.push(T("संस्था का नाम", W / 2, H * 0.1, W * 0.1, "#fff", font, {}));
    L.push({ id: id(), t: "circle", x: W / 2, y: H * 0.4, r: W * 0.24, fill: acc, op: 0.18 }); L.push({ id: id(), t: "ring", x: W / 2, y: H * 0.4, r: W * 0.24, stroke: acc, sw: 6, op: 1 });
    L.push(T(head, W / 2, H * 0.66, fit(head, W, W * 0.12), ink, font, {})); L.push(T(sub, W / 2, H * 0.74, W * 0.07, ink, "Noto Sans Devanagari", { weight: 500, op: 0.7 }));
    for (let i = 0; i < 24; i++) L.push(bar(W * 0.2 + i * (W * 0.6) / 24, H * 0.84, i % 3 ? 4 : 8, H * 0.08, ink, 0.8));
  } else if (lay === "stamp") {
    L.push({ id: id(), t: "ring", x: W / 2, y: H / 2, r: base * 0.46, stroke: ink, sw: 12, op: 1 }); L.push({ id: id(), t: "ring", x: W / 2, y: H / 2, r: base * 0.38, stroke: ink, sw: 4, op: 1 });
    L.push(T(head, W / 2, H * 0.44, fit(head, W * 0.6, base * 0.12), ink, font, {})); L.push(T(sub, W / 2, H * 0.6, fit(sub, W * 0.55, base * 0.07), ink, "Noto Sans Devanagari", { weight: 600 }));
  } else if (lay === "invite") {
    L.push({ id: id(), t: "ring", x: W / 2, y: H / 2, r: base * 0.0, stroke: acc, sw: 0 });
    L.push(bar(W * 0.05, H * 0.04, W * 0.9, H * 0.92, "none", 1, 12).t && { id: id(), t: "rect", x: W * 0.05, y: H * 0.04, w: W * 0.9, h: H * 0.92, fill: "none", stroke: acc, sw: 6, rx: 20, op: 1 });
    L.push({ id: id(), t: "rect", x: W * 0.08, y: H * 0.07, w: W * 0.84, h: H * 0.86, fill: "none", stroke: acc, sw: 2, rx: 14, op: 1 });
    L.push({ id: id(), t: "circle", x: W / 2, y: H * 0.2, r: base * 0.05, fill: acc, op: 1 });
    L.push(T(head, W / 2, H * 0.4, fit(head, W * 0.8, base * 0.14), ink, font, {}));
    L.push(T(sub, W / 2, H * 0.62, fit(sub.split("\n")[0], W * 0.8, base * 0.05), ink, "Noto Sans Devanagari", { weight: 500, lh: 1.7 }));
  } else if (lay === "logo") {
    L.push({ id: id(), t: "circle", x: W / 2, y: H * 0.38, r: W * 0.2, fill: acc, op: 1 }); L.push({ id: id(), t: "poly", points: [[W * 0.43, H * 0.3], [W * 0.43, H * 0.46], [W * 0.58, H * 0.38]], fill: "#fff", op: 1 });
    L.push(T(head, W / 2, H * 0.72, fit(head, W, W * 0.17), ink, font, {})); L.push(T(sub, W / 2, H * 0.84, W * 0.06, ink, "Noto Sans Devanagari", { weight: 500, op: 0.7 }));
  } else if (lay === "video") {
    L.push(bar(0, 0, W, H * 0.1, "#000", 1)); L.push(bar(0, H * 0.9, W, H * 0.1, "#000", 1));
    L.push({ id: id(), t: "circle", x: W / 2, y: H * 0.46, r: base * 0.17, fill: acc, op: 0.95 });
    L.push({ id: id(), t: "poly", points: [[W / 2 - base * 0.05, H * 0.46 - base * 0.08], [W / 2 - base * 0.05, H * 0.46 + base * 0.08], [W / 2 + base * 0.09, H * 0.46]], fill: "#fff", op: 1 });
    L.push(T(head, W / 2, H * 0.74, fit(head, W, base * 0.09), ink, font, {})); L.push(T(sub, W / 2, H * 0.83, base * 0.04, ink, "Noto Sans Devanagari", { weight: 500, op: 0.7 }));
    L.push(bar(W * 0.06, H * 0.93, W * 0.88, 6, "#fff", 0.25, 3)); L.push(bar(W * 0.06, H * 0.93, W * 0.3, 6, acc, 1, 3));
  }
  return { v: 1, tpl: tp.id, w: tp.w, h: tp.h, unit: tp.unit, W, H, bg: [b1, b2, 135], layers: L.filter(Boolean) };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fam = (f) => `'${f}','Noto Sans Devanagari',sans-serif`;

function baseSvg(l) {
  const op = l.op ?? 1, tf = l.rot ? ` transform="rotate(${l.rot} ${l.x} ${l.y})"` : "", d = `data-id="${l.id}"`;
  if (l.t === "rect" && l.img) return `<clipPath id="c-${l.id}"><rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${l.rx || 0}"/></clipPath><image ${d} x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" href="${l.img}" preserveAspectRatio="xMidYMid slice" clip-path="url(#c-${l.id})" opacity="${op}"${tf}/>`;
  if (l.t === "rect") return `<rect ${d} x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" rx="${l.rx || 0}" fill="${l.fill}" ${l.stroke ? `stroke="${l.stroke}" stroke-width="${l.sw || 2}"` : ""} opacity="${op}"${tf}/>`;
  if (l.t === "circle") return `<circle ${d} cx="${l.x}" cy="${l.y}" r="${l.r}" fill="${l.fill}" opacity="${op}"/>`;
  if (l.t === "ring") return `<circle ${d} cx="${l.x}" cy="${l.y}" r="${l.r}" fill="none" stroke="${l.stroke}" stroke-width="${l.sw || 4}" opacity="${op}"/>`;
  if (l.t === "poly") return `<polygon ${d} points="${l.points.map((p) => p.map((n) => Math.round(n * 10) / 10).join(",")).join(" ")}" fill="${l.fill}" opacity="${op}"/>`;
  if (l.t === "path") return `<path ${d} d="${l.d}" fill="${l.fill}" opacity="${op}"/>`;
  if (l.t === "text") {
    const lines = String(l.text).split("\n"), lh = (l.lh || 1.2) * l.size, y0 = l.y - ((lines.length - 1) * lh) / 2;
    const anchor = l.anchor || "middle";
    return `<text ${d} x="${l.x}" y="${y0}" font-family="${fam(l.font)}" font-size="${l.size}" font-weight="${l.weight || 700}" fill="${l.fill}" opacity="${op}" text-anchor="${anchor}" dominant-baseline="central"${l.ls ? ` letter-spacing="${l.ls}"` : ""}${l.it ? ` font-style="italic"` : ""}${l.ul ? ` text-decoration="underline"` : ""}${l.stroke ? ` stroke="${l.stroke}" stroke-width="${l.sw || 4}" paint-order="stroke"` : ""}${tf} style="white-space:pre">${lines.map((s, i) => `<tspan x="${l.x}" dy="${i ? lh : 0}">${esc(s) || " "}</tspan>`).join("")}</text>`;
  }
  return "";
}
// gradient fill (l.g2 second colour, l.ga angle) and drop shadow (l.sh = {c,b,x,y}) are layered on top of the plain shapes
export function layerSvg(l) {
  if (l.hid) return "";
  let defs = "", L2 = l;
  if (l.g2 && l.fill && l.fill !== "none" && l.t !== "ring" && !l.img) {
    defs += `<linearGradient id="g-${l.id}" gradientTransform="rotate(${l.ga ?? 90} .5 .5)"><stop offset="0" stop-color="${l.fill}"/><stop offset="1" stop-color="${l.g2}"/></linearGradient>`;
    L2 = { ...l, fill: `url(#g-${l.id})` };
  }
  let out = baseSvg(L2);
  if (l.sh) {
    defs += `<filter id="s-${l.id}" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="${l.sh.x ?? 6}" dy="${l.sh.y ?? 8}" stdDeviation="${(l.sh.b ?? 12) / 2}" flood-color="${l.sh.c || "#000000"}" flood-opacity="${l.sh.o ?? 0.5}"/></filter>`;
    out = `<g filter="url(#s-${l.id})">${out}</g>`;
  }
  if (l.lock) out = `<g pointer-events="none">${out}</g>`;
  return defs ? `<defs>${defs}</defs>${out}` : out;
}
export function designSvg(d, { fontCss = "", id: sid = "d" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.W} ${d.H}" width="${d.W}" height="${d.H}" data-w="${d.W}" data-h="${d.H}"><defs>${fontCss ? `<style>${fontCss}</style>` : ""}<linearGradient id="bg${sid}" gradientTransform="rotate(${d.bg[2] ?? 135} .5 .5)"><stop offset="0" stop-color="${d.bg[0]}"/><stop offset="1" stop-color="${d.bg[1]}"/></linearGradient></defs><rect width="${d.W}" height="${d.H}" fill="url(#bg${sid})"/>${d.layers.map(layerSvg).join("")}</svg>`;
}

// fonts for the preview/editor page and for embedding into exported files
export const loadDeco = loadFontCss;
const b64 = (buf) => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
export async function embedFontCss(d) {
  const fams = [...new Set(d.layers.filter((l) => l.t === "text").map((l) => l.font).concat("Noto Sans Devanagari"))];
  const sheets = await Promise.all(["../../vendor/fonts/deco/deco.css", "../../vendor/fonts/more/more.css"].map(async (rel) => { const u = new URL(rel, import.meta.url); return { u, css: await (await fetch(u)).text() }; }));
  let css = "";
  for (const f of fams) {
    const faces = [];
    if (f === "Noto Sans Devanagari") faces.push([new URL("../../vendor/fonts/NotoSansDevanagari-VF.ttf", import.meta.url), "100 900"]);
    else for (const { u, css: c } of sheets) for (const m of c.matchAll(new RegExp(`font-family:"${f}";src:url\\("([^"]+)"\\)[^}]*?font-weight:([^;}]+)`, "g"))) faces.push([new URL(m[1], u), m[2]]);
    for (const [file, weight] of faces) { try { const buf = await (await fetch(file)).arrayBuffer(); css += `@font-face{font-family:'${f}';src:url(data:font/ttf;base64,${b64(buf)}) format('truetype');font-weight:${weight}}`; } catch (_) { /* missing: fallback */ } }
  }
  return css;
}

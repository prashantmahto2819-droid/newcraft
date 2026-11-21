import { h, icon, toast, downloadBlob } from "../ui.js";
import { loadImg } from "../tools/pdf.js";
import { loadFontCss, fontWeight, fontOptions } from "../data/fonts_all.js";
import { pickFile } from "./shared.js";
import { L, field, note, sel, textIn } from "./tools_img.js";

const SIZES = { sq: [1080, 1080], pt: [1080, 1350], st: [1080, 1920] };
const PRESETS = ["जन्मदिन की हार्दिक शुभकामनाएँ", "सुप्रभात", "शुभ रात्रि", "दीपावली की हार्दिक शुभकामनाएँ", "होली की हार्दिक शुभकामनाएँ", "नववर्ष की हार्दिक शुभकामनाएँ", "विवाह की वर्षगांठ की बधाई", "रक्षाबंधन की शुभकामनाएँ", "ईद मुबारक", "गुरु पूर्णिमा की शुभकामनाएँ", "बधाई हो!", "भावभीनी श्रद्धांजलि"];
const PRESETS_EN = ["Happy Birthday!", "Good Morning", "Good Night", "Happy Diwali", "Happy Holi", "Happy New Year", "Happy Anniversary", "Happy Raksha Bandhan", "Eid Mubarak", "Merry Christmas", "Congratulations!", "Thank You"];
const presets = () => (document.documentElement.lang === "en" ? PRESETS_EN : PRESETS);
const BGN_EN = { sun: "Sunrise", marigold: "Marigold", royal: "Royal blue", peacock: "Peacock green", rose: "Rose", night: "Night", saffron: "Saffron", white: "Plain white" };
const BGS = { sun: ["सूर्योदय", "#ff8a3c", "#ffd86b", "#7c2d12", "rays"], marigold: ["गेंदा", "#f59e0b", "#fde68a", "#78350f", "dots"], royal: ["राजसी नीला", "#1e1b4b", "#3730a3", "#fde68a", "mandala"], peacock: ["मोर हरा", "#064e3b", "#0891b2", "#fef08a", "mandala"], rose: ["गुलाबी", "#be185d", "#f9a8d4", "#fff1f2", "petals"], night: ["रात", "#0f172a", "#1e3a8a", "#fde68a", "stars"], saffron: ["केसरिया", "#ea580c", "#fb923c", "#fff7ed", "mandala"], plain: ["सादा सफ़ेद", "#ffffff", "#f1f5f9", "#0f172a", "none"] };
const loadDeco = loadFontCss;
const rnd = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function pattern(x, W, H, kind, ink) {
  x.save(); x.globalAlpha = 0.16; x.strokeStyle = x.fillStyle = ink; const cx = W / 2, cy = H * 0.5, R = Math.max(W, H);
  if (kind === "rays") { for (let i = 0; i < 24; i++) { x.beginPath(); x.moveTo(cx, H * 0.95); x.arc(cx, H * 0.95, R, (Math.PI * (i * 2 + 0.2)) / 24 + Math.PI, (Math.PI * (i * 2 + 1.2)) / 24 + Math.PI); x.closePath(); x.fill(); } }
  else if (kind === "dots") { for (let y = 40; y < H; y += 70) for (let k = 40 + ((y / 70) % 2) * 35; k < W; k += 70) { x.beginPath(); x.arc(k, y, 9, 0, 7); x.fill(); } }
  else if (kind === "stars") { const r = rnd(7); for (let i = 0; i < 90; i++) { x.globalAlpha = 0.25 + r() * 0.6; x.beginPath(); x.arc(r() * W, r() * H, 1 + r() * 3.2, 0, 7); x.fill(); } }
  else if (kind === "petals") { const r = rnd(3); for (let i = 0; i < 26; i++) { x.save(); x.translate(r() * W, r() * H); x.rotate(r() * 6); x.globalAlpha = 0.18 + r() * 0.2; x.beginPath(); x.ellipse(0, 0, 18 + r() * 26, 9 + r() * 12, 0, 0, 7); x.fill(); x.restore(); } }
  else if (kind === "mandala") { x.lineWidth = 3; for (const [cxx, cyy, s] of [[cx, H * 0.5, 1], [0, 0, 0.55], [W, H, 0.55]]) for (let ring = 1; ring <= 6; ring++) { const n = 8 + ring * 4, rr = ring * 80 * s * (W / 1080) * 1.4; for (let i = 0; i < n; i++) { x.save(); x.translate(cxx, cyy); x.rotate((i / n) * Math.PI * 2); x.beginPath(); x.ellipse(rr, 0, 36 * s * (1 + ring * 0.15), 11 * s * (1 + ring * 0.1), 0, 0, 7); x.stroke(); x.restore(); } } }
  x.restore();
}
function frame(x, W, H, ink, style) {
  if (style === "none") return; x.save(); x.strokeStyle = ink; x.lineWidth = 6; x.globalAlpha = 0.9; const m = 36; x.strokeRect(m, m, W - 2 * m, H - 2 * m);
  if (style === "double") { x.lineWidth = 2; x.strokeRect(m + 16, m + 16, W - 2 * m - 32, H - 2 * m - 32); }
  if (style === "ornate") { x.lineWidth = 2; x.strokeRect(m + 16, m + 16, W - 2 * m - 32, H - 2 * m - 32); x.fillStyle = ink; for (const [a, b] of [[m, m], [W - m, m], [m, H - m], [W - m, H - m]]) { x.beginPath(); x.arc(a, b, 26, 0, 7); x.fill(); x.beginPath(); x.arc(a, b, 38, 0, 7); x.stroke(); } }
  x.restore();
}
function wrap(x, text, maxW) { const out = []; for (const para of text.split("\n")) { let line = ""; for (const w of para.split(/\s+/)) { const t = line ? line + " " + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; } out.push(line); } return out; }
function block(x, d, text, font, weight, size, cy, W, color, maxLines, maxW) {
  if (!text) return cy; let s = size, lines;
  do { x.font = `${weight} ${s}px "${font}", "Noto Sans Devanagari", sans-serif`; lines = wrap(x, text, maxW); s -= 4; } while ((lines.length > maxLines || lines.some((l) => x.measureText(l).width > maxW)) && s > 28);
  const lh = (s + 4) * 1.32, y0 = cy - ((lines.length - 1) * lh) / 2; x.textAlign = "center"; x.textBaseline = "middle";
  lines.forEach((l, i) => { const y = y0 + i * lh; if (d.shadow) { x.save(); x.shadowColor = "#0008"; x.shadowBlur = 18; x.shadowOffsetY = 6; x.fillStyle = color; x.fillText(l, W / 2, y); x.restore(); } if (d.outline) { x.lineWidth = Math.max(4, s / 9); x.strokeStyle = d.outlineColor; x.lineJoin = "round"; x.strokeText(l, W / 2, y); } x.fillStyle = color; x.fillText(l, W / 2, y); });
  return cy + (lines.length * lh) / 2;
}
export function drawGreeting(cv, d, photo) {
  const [W, H] = SIZES[d.size], bg = BGS[d.bg]; cv.width = W; cv.height = H; const x = cv.getContext("2d"), g = x.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, bg[1]); g.addColorStop(1, bg[2]); x.fillStyle = g; x.fillRect(0, 0, W, H);
  pattern(x, W, H, bg[4], d.bg === "plain" ? "#94a3b8" : bg[3] === "#fde68a" || bg[3] === "#fef08a" ? "#fff" : bg[3]); frame(x, W, H, d.ink || bg[3], d.frame);
  const ink = d.ink || bg[3]; let cy = H * 0.17;
  if (photo) { const r = W * 0.17, py = H * 0.25; x.save(); x.beginPath(); x.arc(W / 2, py, r, 0, 7); x.clip(); const s = Math.max((2 * r) / photo.width, (2 * r) / photo.height); x.drawImage(photo, W / 2 - (photo.width * s) / 2, py - (photo.height * s) / 2, photo.width * s, photo.height * s); x.restore(); x.lineWidth = 10; x.strokeStyle = ink; x.beginPath(); x.arc(W / 2, py, r + 8, 0, 7); x.stroke(); cy = py + r + H * 0.06; } else cy = H * 0.22;
  const mid = photo ? (cy + H * 0.8) / 2 + H * 0.02 : H * 0.46;
  const end = block(x, d, d.title, d.font, fontWeight(d.font), W * 0.115, photo ? mid - H * 0.05 : mid, W, d.color, 4, W * 0.8);
  block(x, d, d.sub, d.font2, 400, W * 0.052, Math.max(end + H * 0.06, mid + H * 0.14), W, d.color, 3, W * 0.78);
  block(x, d, d.name, d.font, fontWeight(d.font), W * 0.06, H * 0.88, W, ink, 1, W * 0.8);
}
export function greetingTool() {
  const d = { size: "sq", bg: "sun", title: presets()[0], sub: L("आपका जीवन खुशियों से भरा रहे", "May your life be full of joy"), name: L("— आपका नाम", "— Your name"), font: "Yatra One", font2: "Kalam", color: "#ffffff", ink: "", outline: true, outlineColor: "#7c2d12", shadow: true, frame: "ornate" }; let photo = null;
  const out = h("div.canvasbox"), cv = document.createElement("canvas"); cv.className = "prev"; out.append(cv);
  const draw = async () => { await loadDeco(); try { await Promise.all([d.font, d.font2].map((f) => document.fonts.load(`700 40px "${f}"`))); await document.fonts.load('400 30px "Kalam"'); } catch {} drawGreeting(cv, d, photo); };
  const fontOpts = fontOptions(), t = (k, label, o = {}) => field(label, textIn(d[k], (v) => { d[k] = v; draw(); }, o));
  const colorIn = (k) => h("input", { type: "color", value: d[k] || "#ffffff", oninput: (e) => { d[k] = e.target.value; draw(); } });
  const sample = h("div", { style: { fontSize: "13px", opacity: 0.7 } }, L("फ़ॉन्ट बदलने पर नीचे तुरंत दिखेगा", "Preview updates instantly"));
  draw();
  return h("div.form", note(L("शुभकामना, बधाई, सुप्रभात और पोस्टर के लिए सजावटी हिंदी पोस्टर बनाइए। सारे फ़ॉन्ट और डिज़ाइन मुफ़्त/ओपन लाइसेंस वाले हैं, WhatsApp/Instagram के लिए सीधे डाउनलोड कीजिए।", "Make decorative Hindi greeting posters. All fonts are free open-licence; download for WhatsApp/Instagram.")),
    h("div.grid2", field(L("संदेश चुनिए", "Preset"), sel(presets().map((p) => [p, p]), presets()[0], (v) => { d.title = v; draw(); })), t("title", L("मुख्य संदेश", "Main text")), t("sub", L("छोटी पंक्ति", "Sub line")), t("name", L("नाम / हस्ताक्षर", "Name")),
      field(L("साइज़", "Size"), sel([["sq", "1080×1080 (Insta/WhatsApp)"], ["pt", "1080×1350 (Insta post)"], ["st", "1080×1920 (Status/Story)"]], d.size, (v) => { d.size = v; draw(); })),
      field(L("बैकग्राउंड", "Background"), sel(Object.entries(BGS).map(([k, v]) => [k, L(v[0], BGN_EN[k] || k)]), d.bg, (v) => { d.bg = v; d.ink = ""; draw(); })),
      field(L("मुख्य फ़ॉन्ट", "Main font"), sel(fontOpts, d.font, (v) => { d.font = v; draw(); })), field(L("छोटी पंक्ति का फ़ॉन्ट", "Sub font"), sel(fontOpts, d.font2, (v) => { d.font2 = v; draw(); })),
      field(L("टेक्स्ट रंग", "Text colour"), colorIn("color")), field(L("बॉर्डर/नाम रंग", "Border colour"), colorIn("ink")),
      field(L("फ़्रेम", "Frame"), sel([["ornate", L("सजावटी", "Ornate")], ["double", L("दोहरा", "Double")], ["single", L("सादा", "Single")], ["none", L("नहीं", "None")]], d.frame, (v) => { d.frame = v; draw(); })),
      field(L("आउटलाइन", "Outline"), h("input", { type: "checkbox", checked: d.outline, onchange: (e) => { d.outline = e.target.checked; draw(); } })), field(L("आउटलाइन रंग", "Outline colour"), colorIn("outlineColor")), field(L("परछाईं", "Shadow"), h("input", { type: "checkbox", checked: d.shadow, onchange: (e) => { d.shadow = e.target.checked; draw(); } }))),
    h("div.btnrow", h("button.ghost", { onclick: () => pickFile("image/*", async (f) => { photo = await loadImg(f); draw(); }) }, icon("image", 16), L("फ़ोटो जोड़िए (गोल)", "Add photo (round)")), h("button.ghost", { onclick: () => { photo = null; draw(); } }, L("फ़ोटो हटाइए", "Remove photo")),
      h("button.primary", { onclick: async () => { await draw(); cv.toBlob((b) => downloadBlob("shubhkamna.png", b)); } }, icon("download", 16), "PNG"), h("button.primary", { onclick: async () => { await draw(); cv.toBlob((b) => downloadBlob("shubhkamna.jpg", b), "image/jpeg", 0.93); } }, icon("download", 16), "JPG")), sample, out);
}

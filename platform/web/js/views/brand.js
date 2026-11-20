import { h, icon, modal, toast, confirmBox, downloadBlob } from "../ui.js";
import { t } from "../i18n.js";
import { FONTS } from "../data/catalog.js";
import { guard, pickFile } from "./shared.js";

// ---- colour helpers ----
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function hexToHsl(hex) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex); if (!m) return [0, 0, 50]; let [r, g, b] = [1, 2, 3].map((i) => parseInt(m[i], 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let hh = 0, s = 0; const l = (mx + mn) / 2; if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; } return [hh, s * 100, l * 100]; }
export function hslToHex(hh, s, l) { hh = ((hh % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100; const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + hh / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0"); }; return "#" + f(0) + f(8) + f(4); }
export function harmony(base, kind) {
  const [hh, s, l] = hexToHsl(base);
  if (kind === "complement") return [base, hslToHex(hh + 180, s, l), hslToHex(hh + 180, s, l - 18), hslToHex(hh, s, l - 22), hslToHex(hh, s * 0.5, 92)];
  if (kind === "triad") return [base, hslToHex(hh + 120, s, l), hslToHex(hh + 240, s, l), hslToHex(hh, s * 0.4, 92), hslToHex(hh, s, l - 25)];
  if (kind === "shades") return [92, 78, 62, 46, 30].map((x) => hslToHex(hh, s, x));
  return [hslToHex(hh - 40, s, l), hslToHex(hh - 20, s, l), base, hslToHex(hh + 20, s, l), hslToHex(hh + 40, s, l)];
}
export function dominantColors(imgData, n = 6) {
  const bins = new Map(); const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); const b = bins.get(k) || [0, 0, 0, 0]; b[0]++; b[1] += d[i]; b[2] += d[i + 1]; b[3] += d[i + 2]; bins.set(k, b); }
  const cols = [...bins.values()].sort((a, b) => b[0] - a[0]).map((b) => [b[1] / b[0], b[2] / b[0], b[3] / b[0]]); const out = [];
  for (const c of cols) { if (out.every((o) => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 48)) out.push(c); if (out.length >= n) break; }
  return out.map((c) => "#" + c.map((x) => Math.round(x).toString(16).padStart(2, "0")).join(""));
}
const textOn = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111" : "#fff"; };
const swatch = (hex, onclick) => h("button.swatch", { style: { background: hex, color: textOn(hex) }, title: hex, onclick: onclick || (() => copy(hex)) }, hex);
async function copy(txt) { try { await navigator.clipboard.writeText(txt); toast(t("copied") + " " + txt); } catch { toast(txt); } }

export function kitModal(ctx, kit, seedColors) {
  const k = { id: kit?.id, name: kit?.name || "", colors: [...(kit?.colors || seedColors || ["#0f766e", "#14b8a6", "#f59e0b", "#111827"])], fonts: [...(kit?.fonts || ["Noto Sans Devanagari"])] };
  const name = h("input", { value: k.name, placeholder: t("kit_name"), "aria-label": t("kit_name") });
  const colorBox = h("div.swatches"); const fontBox = h("div.chips");
  const drawC = () => { colorBox.textContent = ""; k.colors.forEach((c, i) => colorBox.append(h("label.cpick", { style: { background: c } }, h("input", { type: "color", value: c, oninput: (e) => { k.colors[i] = e.target.value; e.target.parentNode.style.background = e.target.value; } }), h("button.rm", { type: "button", "aria-label": "remove", onclick: (e) => { e.preventDefault(); k.colors.splice(i, 1); drawC(); } }, "×")))); if (k.colors.length < 12) colorBox.append(h("button.addc", { type: "button", "aria-label": t("add_color"), onclick: () => { k.colors.push("#888888"); drawC(); } }, icon("plus", 18))); };
  const drawF = () => { fontBox.textContent = ""; for (const f of FONTS) fontBox.append(h("button.chip" + (k.fonts.includes(f) ? ".on" : ""), { type: "button", style: { fontFamily: `"${f}", system-ui` }, onclick: () => { k.fonts = k.fonts.includes(f) ? k.fonts.filter((x) => x !== f) : [...k.fonts, f]; drawF(); } }, f)); };
  drawC(); drawF();
  modal({ title: kit ? t("rename") + ": " + kit.name : t("new_kit"), wide: true, body: h("div.form", h("label", t("kit_name")), name, h("label", t("colors")), colorBox, h("label", t("fonts")), fontBox),
    actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", run: () => guard(async () => { await ctx.store.saveKit({ ...kit, id: k.id, name: name.value.trim() || t("untitled"), colors: k.colors, fonts: k.fonts }); toast(t("saved")); ctx.refresh(); }) }] });
}

function generator(ctx) {
  let base = "#0f766e", kind = "analogous", pal = harmony(base, kind);
  const out = h("div.swatches.big"); const imgOut = h("div.swatches.big");
  const draw = () => { pal = harmony(base, kind); out.textContent = ""; pal.forEach((c) => out.append(swatch(c))); };
  const baseIn = h("input", { type: "color", value: base, "aria-label": t("base_color"), oninput: (e) => { base = e.target.value; draw(); } });
  const sel = h("select", { "aria-label": t("harmony"), onchange: (e) => { kind = e.target.value; draw(); } }, [["analogous", "h_analogous"], ["complement", "h_complement"], ["triad", "h_triad"], ["shades", "h_shades"]].map(([v, k]) => h("option", { value: v }, t(k))));
  let imgColors = [];
  const pick = () => pickFile("image/*", (f) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d"); x.drawImage(img, 0, 0, 64, 64); imgColors = dominantColors(x.getImageData(0, 0, 64, 64)); imgOut.textContent = ""; imgColors.forEach((col) => imgOut.append(swatch(col))); URL.revokeObjectURL(img.src); }; img.src = URL.createObjectURL(f); });
  draw();
  return h("section.card", h("div.card-head", h("h2", t("palette_gen"))),
    h("div.gen", h("label", t("base_color"), baseIn), h("label", t("harmony"), sel), h("button.ghost", { onclick: () => kitModal(ctx, null, pal) }, icon("plus", 16), t("use_palette"))), out,
    h("div.card-head.sp", h("h2", t("from_image")), h("button.ghost", { onclick: pick }, icon("image", 16), t("pick_image"))), imgOut,
    h("button.ghost.sm", { onclick: () => imgColors.length ? kitModal(ctx, null, imgColors) : pick() }, icon("plus", 16), t("use_palette")));
}

export async function render(ctx) {
  const kits = await ctx.store.listKits();
  const card = (k) => h("article.card.kit", h("div.card-head", h("h3", k.name), h("div.row-actions",
    h("button.icon-btn", { "aria-label": t("rename"), onclick: () => kitModal(ctx, k) }, icon("edit", 17)),
    h("button.icon-btn", { "aria-label": t("export_css"), title: t("export_css"), onclick: () => downloadBlob(k.name + ".css", new Blob([":root{\n" + k.colors.map((c, i) => `  --brand-${i + 1}: ${c};`).join("\n") + `\n  --brand-font: ${k.fonts.map((f) => `"${f}"`).join(", ")};\n}\n`], { type: "text/css" })) }, icon("download", 17)),
    h("button.icon-btn", { "aria-label": t("export_json"), title: t("export_json"), onclick: () => downloadBlob(k.name + ".json", new Blob([JSON.stringify({ name: k.name, colors: k.colors, fonts: k.fonts }, null, 2)], { type: "application/json" })) }, icon("copy", 17)),
    h("button.icon-btn", { "aria-label": t("delete"), onclick: async () => { if (await confirmBox(t("confirm_delete"))) guard(async () => { await ctx.store.removeKit(k.id); ctx.refresh(); }); } }, icon("trash", 17)))),
    h("div.swatches", k.colors.map((c) => swatch(c))), h("div.fontline", k.fonts.map((f) => h("span", { style: { fontFamily: `"${f}", system-ui` } }, f))));
  return h("div.view", h("div.page-head", h("div", h("h1", t("brand_title")), h("p.sub", t("brand_sub"))), h("button.primary", { onclick: () => kitModal(ctx) }, icon("plus", 18), t("new_kit"))),
    kits.length ? h("div.kits", kits.map(card)) : null, generator(ctx));
}

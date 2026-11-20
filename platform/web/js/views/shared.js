import { h, icon, modal, toast, menu, confirmBox, downloadBlob } from "../ui.js";
import { t, bytes, dateFmt, getLang } from "../i18n.js";
import { APPS, TEMPLATES } from "../data/catalog.js";

export const appIcon = (app, size = 40) => {
  const a = APPS[app]; const glyph = { vector: "M5 19C7 7 17 7 19 19", photo: "M3 19l6-9 4 6 3-4 5 7z", pdf: "M7 3h7l5 5v13H7z", film: "M7 5h10v14H7zM10 9l5 3-5 3z" }[app];
  const s = h("span.appicon", { style: { width: size + "px", height: size + "px", background: `linear-gradient(160deg, ${a.color}, ${a.color2})` } });
  const svg = icon("box", size * 0.58); svg.querySelector("path").setAttribute("d", glyph); s.append(svg); return s;
};
export const tplName = (tp) => (getLang() === "hi" ? tp.hi : tp.en);
export const sizeLabel = (m) => (m && m.w ? `${m.w}×${m.h} ${m.unit}` : "");

export function openInApp(p) {
  const a = APPS[p.app];
  if (a.web) window.open(a.web + "?project=" + encodeURIComponent(p.id), "_blank", "noopener");
  else location.hash = "#/downloads";
}
export async function downloadFile(ctx, p) {
  try { const f = await ctx.store.fileBlob(p.id); if (!f) return toast(t("upload") + "?", "err"); downloadBlob(f.name, f.blob); } catch (e) { toast(t("error"), "err"); console.error(e); }
}
export function pickFile(accept, cb) {
  const i = h("input", { type: "file", accept, style: { display: "none" }, onchange: () => i.files[0] && cb(i.files[0]) }); document.body.append(i); i.click(); setTimeout(() => i.remove(), 60000);
}
export async function guard(fn) { try { return await fn(); } catch (e) { console.error(e); toast(e?.message === "too_big_demo" ? t("too_big_demo") : t("error") + (e?.message ? `: ${e.message}` : ""), "err"); } }

export function projectMenu(ctx, p, anchor) {
  menu(anchor, [
    { icon: "ext", label: t("open_app"), run: () => openInApp(p) },
    { icon: "upload", label: t("upload"), run: () => pickFile(APPS[p.app].exts.map((e) => "." + e).join(","), (f) => guard(async () => { await ctx.store.attachFile(p.id, f); toast(t("uploaded")); ctx.refresh(); })) },
    ...(p.file_name ? [{ icon: "download", label: t("download"), run: () => downloadFile(ctx, p) }] : []),
    { icon: "edit", label: t("rename"), run: () => renameModal(ctx, p) },
    { icon: "copy", label: t("duplicate"), run: () => guard(async () => { await ctx.store.duplicateProject(p.id); toast(t("created")); ctx.refresh(); }) },
    "-",
    { icon: "trash", label: t("delete"), danger: true, run: async () => { if (await confirmBox(t("confirm_delete"))) guard(async () => { await ctx.store.removeProject(p.id); toast(t("deleted")); ctx.refresh(); }); } },
  ]);
}
function renameModal(ctx, p) {
  const inp = h("input", { value: p.name, "aria-label": t("project_name") });
  modal({ title: t("rename"), body: inp, actions: [{ label: t("cancel") }, { label: t("save"), kind: "primary", run: () => guard(async () => { await ctx.store.updateProject(p.id, { name: inp.value.trim() || t("untitled") }); ctx.refresh(); }) }] });
  inp.select();
}

export function projectCard(ctx, p, list = false) {
  const a = APPS[p.app] || APPS.vector;
  const star = h("button.icon-btn.star" + (p.favorite ? ".on" : ""), { "aria-label": "favorite", onclick: (e) => { e.stopPropagation(); guard(async () => { await ctx.store.updateProject(p.id, { favorite: !p.favorite }); ctx.refresh(); }); } }, icon("star", 18, p.favorite));
  const more = h("button.icon-btn", { "aria-label": "menu", onclick: (e) => { e.stopPropagation(); projectMenu(ctx, p, e.currentTarget); } }, icon("more", 18));
  const sub = [sizeLabel(p.meta), p.file_name ? bytes(p.size_bytes) : null, dateFmt(p.updated_at)].filter(Boolean).join(" · ");
  if (list) return h("div.row", { tabindex: 0, onclick: () => openInApp(p) }, appIcon(p.app, 34), h("div.grow", h("b", p.name || t("untitled")), h("small", a.name + " · " + sub)), star, more);
  return h("article.pcard", { tabindex: 0, onclick: () => openInApp(p), onkeydown: (e) => e.key === "Enter" && openInApp(p) },
    h("div.thumb", { style: { background: `linear-gradient(150deg, ${a.color}33, ${a.color2}55)` } }, appIcon(p.app, 52), h("span.dim", sizeLabel(p.meta) || (p.file_name ? p.file_name.split(".").pop().toUpperCase() : "")), star),
    h("div.pmeta", h("div.grow", h("b", { title: p.name }, p.name || t("untitled")), h("small", a.name + " · " + dateFmt(p.updated_at))), more));
}

// New-project dialog. preset: {app, tplId}
export function newProjectModal(ctx, preset = {}) {
  let app = preset.app || "vector"; let tpl = preset.tplId || "";
  const name = h("input", { placeholder: t("untitled"), "aria-label": t("project_name") });
  const appBox = h("div.chips");
  const tplSel = h("select", { "aria-label": t("choose_size"), onchange: () => (tpl = tplSel.value) });
  const fillTpl = () => {
    tplSel.textContent = ""; tplSel.append(h("option", { value: "" }, t("blank")));
    for (const tp of TEMPLATES.filter((x) => x.app === app)) tplSel.append(h("option", { value: tp.id, selected: tp.id === tpl }, `${tplName(tp)} — ${tp.w}×${tp.h} ${tp.unit}`));
    if (!TEMPLATES.some((x) => x.id === tpl && x.app === app)) tpl = ""; tplSel.value = tpl;
  };
  const drawApps = () => { appBox.textContent = ""; for (const k of Object.keys(APPS)) appBox.append(h("button.chip" + (k === app ? ".on" : ""), { type: "button", onclick: () => { app = k; drawApps(); fillTpl(); } }, appIcon(k, 22), APPS[k].name.replace("Tulika ", ""))); };
  drawApps(); fillTpl();
  const body = h("div.form", h("label", t("choose_app")), appBox, h("label", t("choose_size")), tplSel, h("label", t("project_name")), name);
  modal({ title: t("new_project"), body, actions: [{ label: t("cancel") }, { label: t("create"), kind: "primary", run: () => guard(async () => {
    const tp = TEMPLATES.find((x) => x.id === tpl); const p = await ctx.store.createProject({ app, name: name.value.trim() || (tp ? tplName(tp) : t("untitled")), meta: tp ? { template: tp.id, w: tp.w, h: tp.h, unit: tp.unit } : {} });
    toast(t("created")); await ctx.refresh(); if (APPS[app].web) openInApp(p);
  }) }] });
}

export async function importFiles(ctx, files) {
  let n = 0;
  for (const f of files) {
    const app = (await import("../data/catalog.js")).appForFile(f.name);
    if (!app) { toast(`${f.name}: ${t("unknown_type")}`, "err"); continue; }
    await guard(async () => { await ctx.store.createProject({ app, name: f.name.replace(/\.[^.]+$/, ""), file: f }); n++; });
  }
  if (n) { toast(`${n} ${t("created")}`); ctx.refresh(); }
}

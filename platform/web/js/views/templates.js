import { h, icon, debounce } from "../ui.js";
import { getLang } from "../i18n.js";
import { TEMPLATES, TEMPLATE_CATS, APPS } from "../data/catalog.js";
import { CATS, buildDesign, designSvg, hasDesign, loadDeco } from "../data/designs.js";
import { appIcon, newProjectModal, tplName } from "./shared.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);
let q = "", cat = "all", appF = "all";

export async function render(ctx) {
  loadDeco();
  const grid = h("div.tgrid2"), counter = h("small");
  const card = (tp) => {
    const a = APPS[tp.app], c = CATS[tp.cat], d = buildDesign(tp);
    const prev = h("div.tplprev2"); prev.innerHTML = designSvg(d, { id: "p" + tp.id }); const svg = prev.firstChild; svg.removeAttribute("width"); svg.removeAttribute("height");
    const long = tp.w >= tp.h; svg.style.cssText = long ? "width:100%;height:auto" : "height:100%;width:auto";
    return h("div.tcard", { style: { "--c": c.c } },
      h("a.tcard-prev", { href: "#/editor?tpl=" + tp.id, "aria-label": tplName(tp) }, prev, h("span.tcard-badge", c.e + " " + L(c.hi, c.en))),
      h("div.tcard-body", h("b", tplName(tp)), h("small", `${tp.w}×${tp.h} ${tp.unit}`),
        h("div.tcard-act", h("a.primary.sm2", { href: "#/editor?tpl=" + tp.id }, icon("edit", 15), L("एडिट करें", "Edit")),
          h("button.ghost.sm2", { onclick: () => newProjectModal(ctx, { app: tp.app, tplId: tp.id }), title: L("ऐप में खोलें", "Open in app") }, appIcon(tp.app, 16), a.name.replace("Tulika ", "")))));
  };
  const draw = () => {
    const s = q.trim().toLowerCase();
    const list = TEMPLATES.filter((x) => hasDesign(x.id) || true).filter((x) => (cat === "all" || x.cat === cat) && (appF === "all" || x.app === appF) && (!s || (x.hi + " " + x.en + " " + x.id).toLowerCase().includes(s)));
    grid.textContent = ""; list.forEach((x) => grid.append(card(x))); counter.textContent = `${list.length} ${L("टेम्पलेट", "templates")}`;
    if (!list.length) grid.append(h("div.empty", icon("search", 36), h("b", L("कुछ नहीं मिला", "Nothing found"))));
  };
  const catChips = h("div.chips.scroll"), appChips = h("div.chips");
  const chips = () => {
    catChips.textContent = ""; appChips.textContent = "";
    for (const k of ["all", ...TEMPLATE_CATS]) { const c = CATS[k]; catChips.append(h("button.chip" + (cat === k ? ".on" : ""), { style: cat === k && c ? { background: c.c, borderColor: c.c } : null, onclick: () => { cat = k; chips(); draw(); } }, k === "all" ? L("सभी", "All") : `${c.e} ${L(c.hi, c.en)}`)); }
    for (const k of ["all", "photo", "vector", "film"]) appChips.append(h("button.chip" + (appF === k ? ".on" : ""), { onclick: () => { appF = k; chips(); draw(); } }, k === "all" ? L("सभी ऐप", "All apps") : APPS[k].name.replace("Tulika ", "")));
  };
  chips(); draw();
  return h("div.view",
    h("div.page-head", h("div", h("h1", L("टेम्पलेट", "Templates")), h("p.sub", L("पसंद कीजिए, ब्राउज़र में पूरा एडिट कीजिए, PNG / PDF / SVG में डाउनलोड कीजिए", "Pick one, edit everything in your browser, download as PNG / PDF / SVG"))), counter),
    h("div.toolbar", h("div.searchbox", icon("search", 18), h("input", { type: "search", placeholder: L("खोजिए: दिवाली, कार्ड, बैनर…", "Search: diwali, card, banner…"), value: q, oninput: debounce((e) => { q = e.target.value; draw(); }, 120), "aria-label": "search" }))),
    catChips, appChips, grid);
}

import { h } from "../ui.js";
import { t } from "../i18n.js";
import { TEMPLATES, TEMPLATE_CATS, APPS } from "../data/catalog.js";
import { appIcon, newProjectModal, tplName } from "./shared.js";

export async function render(ctx) {
  const box = (tp) => { const r = tp.w / tp.h; const w = r >= 1 ? 74 : 74 * r, hh = r >= 1 ? 74 / r : 74; const a = APPS[tp.app];
    return h("button.tpl", { onclick: () => newProjectModal(ctx, { app: tp.app, tplId: tp.id }) },
      h("div.tplprev", h("i", { style: { width: Math.max(18, w) + "px", height: Math.max(18, hh) + "px", background: `linear-gradient(150deg, ${a.color}, ${a.color2})` } })),
      h("b", tplName(tp)), h("small", `${tp.w}×${tp.h} ${tp.unit}`), h("span.apptag", appIcon(tp.app, 16), a.name.replace("Tulika ", ""))); };
  return h("div.view", h("div.page-head", h("div", h("h1", t("templates_title")), h("p.sub", t("templates_sub")))),
    TEMPLATE_CATS.map((c) => h("section", h("h2.cat", t("cat_" + c)), h("div.tgrid", TEMPLATES.filter((x) => x.cat === c).map(box)))));
}

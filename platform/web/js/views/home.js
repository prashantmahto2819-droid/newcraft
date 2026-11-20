import { h, icon } from "../ui.js";
import { t, bytes } from "../i18n.js";
import { APPS } from "../data/catalog.js";
import { appIcon, projectCard, newProjectModal } from "./shared.js";

export async function render(ctx) {
  const usage = await ctx.store.usage(); const pct = Math.min(100, (usage.bytes / usage.limit) * 100);
  const name = (ctx.user?.email || "").split("@")[0];
  const tiles = Object.keys(APPS).map((k) => h("button.tile", { style: { "--c": APPS[k].color }, onclick: () => newProjectModal(ctx, { app: k }) },
    appIcon(k, 46), h("b", APPS[k].name), h("small", t(APPS[k].descKey)), h("span.badge", APPS[k].web ? t("web_app") + " + " + t("desktop_app") : t("desktop_app"))));
  const recent = ctx.projects.slice(0, 6);
  return h("div.view",
    h("section.hero", h("div", h("h1", `${t("hello")}${name ? ", " + name : ""} 👋`), h("p", t("hello_sub"))),
      h("button.primary.lg", { onclick: () => newProjectModal(ctx) }, icon("plus", 20), t("new_project"))),
    h("div.tiles", tiles),
    h("div.cols",
      h("section.card.grow2", h("div.card-head", h("h2", t("recent")), h("a", { href: "#/projects" }, t("see_all"))),
        recent.length ? h("div.pgrid", recent.map((p) => projectCard(ctx, p))) : h("div.empty", icon("folder", 40), h("b", t("empty_projects")), h("p", t("empty_projects_sub")))),
      h("aside.side",
        h("section.card", h("div.card-head", h("h2", t("storage"))), h("div.meter", h("i", { style: { width: Math.max(2, pct) + "%" } })),
          h("small", `${bytes(usage.bytes)} / ${bytes(usage.limit)} ${t("storage_used")} · ${ctx.projects.length} ${t("nav_projects")}`)),
        h("section.card", h("div.card-head", h("h2", t("whats_new"))), h("ul.tips", [t("tip1"), t("tip2"), t("tip3")].map((x) => h("li", icon("wand", 16), x)))))));
}

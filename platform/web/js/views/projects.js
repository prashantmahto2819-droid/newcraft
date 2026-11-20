import { h, icon, debounce } from "../ui.js";
import { t } from "../i18n.js";
import { APPS } from "../data/catalog.js";
import { projectCard, newProjectModal } from "./shared.js";

const S = { q: "", app: "all", fav: false, sort: "updated", view: (() => { try { return localStorage.getItem("tulika-view") || "grid"; } catch { return "grid"; } })() };

export function filtered(list) {
  const q = S.q.trim().toLowerCase();
  let r = list.filter((p) => (S.app === "all" || p.app === S.app) && (!S.fav || p.favorite) && (!q || (p.name || "").toLowerCase().includes(q) || (p.file_name || "").toLowerCase().includes(q)));
  const by = { updated: (a, b) => b.updated_at.localeCompare(a.updated_at), created: (a, b) => b.created_at.localeCompare(a.created_at), name: (a, b) => (a.name || "").localeCompare(b.name || ""), size: (a, b) => (b.size_bytes || 0) - (a.size_bytes || 0) };
  return r.sort(by[S.sort]);
}

export async function render(ctx) {
  const results = h("div");
  const draw = () => {
    const items = filtered(ctx.projects); results.textContent = "";
    if (!items.length) { results.append(h("div.empty", icon(ctx.projects.length ? "search" : "folder", 40), h("b", ctx.projects.length ? t("empty_search") : t("empty_projects")), ctx.projects.length ? null : h("p", t("empty_projects_sub")))); return; }
    results.append(S.view === "grid" ? h("div.pgrid", items.map((p) => projectCard(ctx, p))) : h("div.rows", items.map((p) => projectCard(ctx, p, true))));
  };
  const search = h("input#search", { type: "search", placeholder: t("search_ph"), value: S.q, "aria-label": t("search_ph"), oninput: debounce((e) => { S.q = e.target.value; draw(); }, 100) });
  const chip = (key, label, on, fn) => h("button.chip" + (on ? ".on" : ""), { onclick: () => { fn(); ctx.rerender(); } }, label);
  const sort = h("select", { "aria-label": "sort", onchange: (e) => { S.sort = e.target.value; draw(); } }, [["updated", "sort_updated"], ["created", "sort_created"], ["name", "sort_name"], ["size", "sort_size"]].map(([v, k]) => h("option", { value: v, selected: S.sort === v }, t(k))));
  const view = (v, ic) => h("button.icon-btn" + (S.view === v ? ".on" : ""), { "aria-label": v, onclick: () => { S.view = v; try { localStorage.setItem("tulika-view", v); } catch {} ctx.rerender(); } }, icon(ic, 19));
  draw();
  return h("div.view",
    h("div.page-head", h("h1", t("all_projects")), h("button.primary", { onclick: () => newProjectModal(ctx) }, icon("plus", 18), t("new_project"))),
    h("div.toolbar", h("div.searchbox", icon("search", 18), search), sort, h("div.seg", view("grid", "grid"), view("list", "list"))),
    h("div.chips.scroll", chip("all", t("all"), S.app === "all" && !S.fav, () => { S.app = "all"; S.fav = false; }),
      Object.keys(APPS).map((k) => chip(k, APPS[k].name.replace("Tulika ", ""), S.app === k, () => { S.app = k; S.fav = false; })),
      chip("fav", "★ " + t("favorites"), S.fav, () => { S.fav = !S.fav; })),
    results);
}

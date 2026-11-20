import { h, icon, modal, toast, confirmBox, downloadBlob } from "../ui.js";
import { t, getLang, setLang } from "../i18n.js";
import { REPO_URL } from "../data/catalog.js";
import { guard } from "./shared.js";

export const applyTheme = (v) => { const r = document.documentElement; v === "light" || v === "dark" ? r.setAttribute("data-theme", v) : r.removeAttribute("data-theme"); try { localStorage.setItem("tulika-theme", v || "system"); } catch {} };
export const getTheme = () => { try { return localStorage.getItem("tulika-theme") || "system"; } catch { return "system"; } };
export const SHORTCUTS = [["/", "search"], ["n", "new project"], ["g h", "Home"], ["g p", "Projects"], ["g t", "Templates"], ["g b", "Brand kits"], ["g x", "Tools"], ["g d", "Downloads"], ["g s", "Settings"], ["?", "Help"]];
export const shortcutsModal = () => modal({ title: t("shortcuts"), body: h("table.keys", SHORTCUTS.map(([k, d]) => h("tr", h("td", h("kbd", k)), h("td", d)))) });

export async function render(ctx) {
  const seg = (items, cur, fn) => h("div.seg.text", items.map(([v, l]) => h("button" + (cur === v ? ".on" : ""), { onclick: () => { fn(v); ctx.rerender(); } }, l)));
  return h("div.view", h("div.page-head", h("h1", t("settings_title"))),
    h("section.card", h("div.setrow", h("b", t("language")), seg([["hi", "हिन्दी"], ["en", "English"]], getLang(), (v) => { setLang(v); ctx.relayout(); })),
      h("div.setrow", h("b", t("theme")), seg([["system", t("theme_system")], ["light", t("theme_light")], ["dark", t("theme_dark")]], getTheme(), applyTheme))),
    h("section.card", h("div.card-head", h("h2", t("account"))),
      h("p", ctx.store.mode === "demo" ? t("mode_demo") : t("mode_cloud")),
      ctx.store.mode === "cloud" ? h("p", `${t("signed_in_as")} `, h("b", ctx.user?.email || "")) : null,
      h("div.btnrow", h("button.ghost", { onclick: () => guard(async () => { const d = await ctx.store.exportAll(); downloadBlob("tulika-data.json", new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); }) }, icon("download", 16), t("export_data")),
        ctx.store.mode === "cloud" ? h("button.ghost", { onclick: () => ctx.store.signOut() }, icon("logout", 16), t("sign_out")) : h("button.danger", { onclick: async () => { if (await confirmBox(t("confirm_delete"))) { await ctx.store.reset(); toast(t("deleted")); ctx.refresh(); } } }, icon("trash", 16), t("reset_demo")))),
    h("section.card", h("div.card-head", h("h2", t("shortcuts"))), h("p.sub", t("help_keys")), h("button.ghost", { onclick: shortcutsModal }, icon("help", 16), "?")),
    h("section.card", h("div.card-head", h("h2", t("about"))), h("p.sub", "Tulika · MIT OR Apache-2.0 · based on open-source work by the ArtCraft team (see NOTICE)."), h("a.ghost", { href: REPO_URL, target: "_blank", rel: "noopener" }, icon("ext", 16), "GitHub")));
}

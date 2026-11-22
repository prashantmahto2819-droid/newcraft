import { h, icon, modal, toast, confirmBox, downloadBlob } from "../ui.js";
import { t, getLang, setLang } from "../i18n.js";
import { guard } from "./shared.js";

export const applyTheme = (v) => { const r = document.documentElement; v === "light" || v === "dark" ? r.setAttribute("data-theme", v) : r.removeAttribute("data-theme"); try { localStorage.setItem("tulika-theme", v || "system"); } catch {} };
export const getTheme = () => { try { return localStorage.getItem("tulika-theme") || "system"; } catch { return "system"; } };
export const SHORTCUTS = [["/", "search"], ["n", "new project"], ["g h", "Home"], ["g p", "Projects"], ["g t", "Templates"], ["g b", "Brand kits"], ["g x", "Tools"], ["g d", "Downloads"], ["g s", "Settings"], ["?", "Help"]];
export const shortcutsModal = () => modal({ title: t("shortcuts"), body: h("table.keys", SHORTCUTS.map(([k, d]) => h("tr", h("td", h("kbd", k)), h("td", d)))) });

// Account access: the admin's way into "Users & approval" (the phone tab bar has no room for it), linking a
// desktop app, and this account's devices with a remove button.
function accessCard(ctx) {
  const hi = getLang() === "hi", a = ctx.access || {};
  if (ctx.store.mode !== "cloud") return null;
  const list = h("div", { id: "mydevices", style: { display: "flex", flexDirection: "column", gap: "6px" } });
  ctx.store.myDevices().then((ds) => ds.forEach((d) => list.append(h("div.setrow", h("span", `${d.name || d.platform || "device"}${d.current ? (hi ? " · यही डिवाइस" : " · this device") : ""}`),
    d.current ? null : h("button.ghost", { onclick: async () => { try { await ctx.store.removeDevice(d.id); ctx.rerender(); } catch (e) { toast(e.message || t("error"), "err"); } } }, hi ? "हटाएँ" : "Remove"))))).catch(console.error);
  return h("section.card", { id: "accesscard" }, h("div.card-head", h("h2", hi ? "खाता, प्लान और डिवाइस" : "Account, plan and devices")),
    h("p.sub", `${hi ? "प्लान" : "Plan"}: ${a.plan || "free"}${a.valid_until ? ` · ${hi ? "मान्य" : "valid until"} ${String(a.valid_until).slice(0, 10)}` : ""}${ctx.devices?.max_devices ? ` · ${hi ? "डिवाइस" : "devices"} ${ctx.devices.devices}/${a.is_admin ? "∞" : ctx.devices.max_devices}` : ""}`),
    h("div.btnrow", a.is_admin ? h("a.primary", { id: "open-admin", href: "#/admin" }, hi ? "यूज़र और मंज़ूरी" : "Users & approval") : null,
      h("a.ghost", { href: "#/link" }, hi ? "डेस्कटॉप ऐप जोड़ें" : "Link a desktop app")), contactRow(ctx, hi), list);
}

// Name and mobile number (asked at sign-up; older accounts can add them here).
function contactRow(ctx, hi) {
  const a = ctx.access || {};
  const name = h("input", { id: "my-name", value: a.display_name || "", "aria-label": hi ? "नाम" : "Name" });
  const phone = h("input", { id: "my-phone", type: "tel", value: a.phone || "", placeholder: "98765 43210", "aria-label": hi ? "मोबाइल नंबर" : "Mobile number" });
  const save = async () => {
    try {
      const r = await ctx.store.setContact(name.value, phone.value);
      if (r && r.ok === false) return toast(r.reason === "phone_taken" ? (hi ? "यह नंबर किसी और खाते में है।" : "This number belongs to another account.") : (hi ? "सही मोबाइल नंबर लिखिए।" : "Enter a valid mobile number."), "err");
      ctx.access = { ...a, display_name: name.value, phone: (r && r.phone) || phone.value }; toast(hi ? "सेव हो गया" : "Saved");
    } catch (e) { toast(e.message || t("error"), "err"); }
  };
  return h("div.grid2", h("label.fld", h("span", hi ? "नाम" : "Name"), name), h("label.fld", h("span", hi ? "मोबाइल नंबर (WhatsApp)" : "Mobile number (WhatsApp)"), phone), h("button.ghost", { onclick: save }, hi ? "नाम और नंबर सेव करें" : "Save name and number"));
}

export async function render(ctx) {
  const seg = (items, cur, fn) => h("div.seg.text", items.map(([v, l]) => h("button" + (cur === v ? ".on" : ""), { onclick: () => { fn(v); ctx.rerender(); } }, l)));
  return h("div.view", h("div.page-head", h("h1", t("settings_title"))),
    h("section.card", h("div.setrow", h("b", t("language")), seg([["hi", "हिन्दी"], ["en", "English"]], getLang(), (v) => { setLang(v); ctx.relayout(); })),
      h("div.setrow", h("b", t("theme")), seg([["system", t("theme_system")], ["light", t("theme_light")], ["dark", t("theme_dark")]], getTheme(), applyTheme))),
    accessCard(ctx),
    h("section.card", h("div.card-head", h("h2", t("account"))),
      h("p", ctx.store.mode === "demo" ? t("mode_demo") : t("mode_cloud")),
      ctx.store.mode === "cloud" ? h("p", `${t("signed_in_as")} `, h("b", ctx.user?.email || "")) : null,
      h("div.btnrow", h("button.ghost", { onclick: () => guard(async () => { const d = await ctx.store.exportAll(); downloadBlob("tulika-data.json", new Blob([JSON.stringify(d, null, 2)], { type: "application/json" })); }) }, icon("download", 16), t("export_data")),
        ctx.store.mode === "cloud" ? h("button.ghost", { onclick: () => ctx.store.signOut() }, icon("logout", 16), t("sign_out")) : h("button.danger", { onclick: async () => { if (await confirmBox(t("confirm_delete"))) { await ctx.store.reset(); toast(t("deleted")); ctx.refresh(); } } }, icon("trash", 16), t("reset_demo")))),
    h("section.card", h("div.card-head", h("h2", t("shortcuts"))), h("p.sub", t("help_keys")), h("button.ghost", { onclick: shortcutsModal }, icon("help", 16), "?")),
    h("section.card", h("div.card-head", h("h2", t("about"))), h("p.sub", "Tulika · MIT OR Apache-2.0 · based on open-source work by the ArtCraft team (see NOTICE).")));
}

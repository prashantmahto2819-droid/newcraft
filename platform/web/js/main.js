import { createStore } from "./store.js";
import { h, icon, toast } from "./ui.js";
import { t, getLang } from "./i18n.js";
import { importFiles, newProjectModal } from "./views/shared.js";
import { applyTheme, getTheme, shortcutsModal } from "./views/settings.js";

const ROUTES = { home: ["nav_home", "home"], projects: ["nav_projects", "folder"], templates: ["nav_templates", "grid"], brand: ["nav_brand", "palette"], tools: ["nav_tools", "wand"], downloads: ["nav_downloads", "download"], settings: ["nav_settings", "settings"] };
const HIDDEN = { editor: ["nav_templates", "grid"], admin: ["nav_admin", "settings"] };
const KEYS = { h: "home", p: "projects", t: "templates", b: "brand", x: "tools", d: "downloads", s: "settings" };
const ctx = { store: null, user: null, projects: [], refresh, rerender, relayout };
let root, main, route = "home";

async function load() { try { ctx.projects = await ctx.store.listProjects(); } catch (e) { console.error(e); toast(t("error"), "err"); ctx.projects = []; } }
async function refresh() { await load(); await rerender(); }
async function rerender() {
  const y = main.scrollTop;
  try { const v = await import(`./views/${route}.js`); const el = await v.render(ctx); main.textContent = ""; main.append(el); } catch (e) { console.error(e); main.textContent = ""; main.append(h("div.empty", h("b", t("error")), h("small", String(e.message || e)))); }
  main.scrollTop = y; document.title = `${t((ROUTES[route] || HIDDEN[route])[0])} · Tulika`;
  root.querySelectorAll("[data-route]").forEach((a) => a.classList.toggle("on", a.dataset.route === (route === "editor" ? "templates" : route)));
}
function relayout() { document.documentElement.lang = getLang(); buildShell(); rerender(); }
const parse = () => { const r = location.hash.replace(/^#\/?/, "").split("?")[0].split("/")[0]; return ROUTES[r] || HIDDEN[r] ? r : "home"; };

function buildShell() {
  root.textContent = "";
  const link = (k, cls) => h("a" + cls, { href: "#/" + k, "data-route": k }, icon(ROUTES[k][1], 21), h("span", t(ROUTES[k][0])));
  const keys = Object.keys(ROUTES);
  main = h("main#main", { tabindex: -1 });
  root.append(
    h("aside.sidebar", h("div.logo", h("img", { src: "icons/mark.svg", alt: "", width: 34, height: 34 }), h("div", h("b", "TULIKA"), h("small", t("app_name")))),
      h("button.primary.wide", { onclick: () => newProjectModal(ctx) }, icon("plus", 18), t("new_project")),
      h("nav", keys.map((k) => link(k, ".navlink")), ctx.access?.is_admin ? h("a.navlink", { href: "#/admin", "data-route": "admin" }, icon("settings", 21), h("span", t("nav_admin"))) : null),
      h("div.sidefoot", ctx.store.mode === "demo" ? h("span.badge.warn", "DEMO") : h("small", ctx.user?.email || ""),
        h("button.icon-btn", { "aria-label": "theme", onclick: () => { const d = document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); applyTheme(d === "dark" ? "light" : "dark"); } }, icon("sun", 19)),
        ctx.store.mode === "cloud" ? h("button.icon-btn", { "aria-label": t("sign_out"), onclick: () => ctx.store.signOut() }, icon("logout", 19)) : null)),
    main,
    h("nav.tabbar", ["home", "projects", "templates", "brand", "tools", "settings"].map((k) => link(k, ".tab"))),
    h("div.dropzone", { id: "drop" }, icon("upload", 44), h("b", t("drop_here"))));
}

function loginView() {
  const email = h("input", { type: "email", autocomplete: "email", "aria-label": t("email") });
  const pass = h("input", { type: "password", autocomplete: "current-password", "aria-label": t("password") });
  const run = (fn, ok) => async () => { try { await fn(); if (ok) toast(ok); } catch (e) { toast(e.message || t("error"), "err"); } };
  root.textContent = "";
  root.append(h("div.login", h("form.card", { onsubmit: (e) => { e.preventDefault(); run(() => ctx.store.signIn(email.value, pass.value))(); } },
    h("img", { src: "icons/mark.svg", alt: "", width: 56, height: 56 }), h("h1", t("login_title")), h("small", t("tagline")),
    h("label", t("email")), email, h("label", t("password")), pass,
    h("button.primary.wide", { type: "submit" }, t("sign_in")),
    h("div.btnrow", h("button.ghost", { type: "button", onclick: run(() => ctx.store.signUp(email.value, pass.value), t("check_email")) }, t("sign_up")),
      h("button.ghost", { type: "button", onclick: run(() => ctx.store.magicLink(email.value), t("check_email")) }, t("magic_link")),
      h("button.ghost", { type: "button", onclick: run(() => ctx.store.resetPassword(email.value), t("check_email")) }, t("forgot"))),
    h("button.link", { type: "button", onclick: () => { try { localStorage.setItem("tulika-force-demo", "1"); } catch {} location.reload(); } }, t("try_demo"))),
    h("div", { style: { position: "fixed", top: "12px", right: "12px" } }, h("button.ghost", { onclick: () => { import("./i18n.js").then((m) => { m.setLang(getLang() === "hi" ? "en" : "hi"); loginView(); }); } }, getLang() === "hi" ? "EN" : "हिं"))));
}

function setupGlobal() {
  const drop = () => document.getElementById("drop");
  let depth = 0;
  addEventListener("dragenter", (e) => { if (e.dataTransfer?.types?.includes("Files")) { depth++; drop()?.classList.add("on"); } });
  addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) drop()?.classList.remove("on"); });
  addEventListener("dragover", (e) => e.preventDefault());
  addEventListener("drop", (e) => { e.preventDefault(); depth = 0; drop()?.classList.remove("on"); if (e.dataTransfer.files.length && ctx.user) importFiles(ctx, [...e.dataTransfer.files]); });
  let g = 0;
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || document.querySelector(".modal")) return;
    if (g && KEYS[e.key]) { location.hash = "#/" + KEYS[e.key]; g = 0; return; } g = 0;
    if (e.key === "g") { g = 1; setTimeout(() => (g = 0), 900); }
    else if (e.key === "/") { e.preventDefault(); if (route !== "projects") location.hash = "#/projects"; setTimeout(() => document.getElementById("search")?.focus(), 80); }
    else if (e.key === "n") newProjectModal(ctx);
    else if (e.key === "?") shortcutsModal();
  });
  addEventListener("hashchange", () => { route = parse(); if (ctx.user && ctx.access?.ok) rerender(); });
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); window.__pwaPrompt = e; if (route === "downloads") rerender(); });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
}

// Shown instead of the app while the account waits for an admin, is blocked, or its plan has ended.
function waitingView(a) {
  const hi = getLang() === "hi";
  const msg = a.status === "blocked" ? (hi ? "यह खाता रोक दिया गया है। एडमिन से संपर्क कीजिए।" : "This account has been blocked. Please contact the admin.")
    : a.expired ? (hi ? "आपके प्लान की अवधि पूरी हो गई है। आगे चलाने के लिए एडमिन से प्लान बढ़वाइए।" : "Your plan has ended. Ask the admin to renew it.")
    : (hi ? "आपका खाता बन गया है। एडमिन की मंज़ूरी के बाद आप Tulika इस्तेमाल कर पाएँगे।" : "Your account is created. You can use Tulika once an admin approves it.");
  root.textContent = "";
  root.append(h("div.login", h("div.card", { id: "waiting" },
    h("img", { src: "icons/mark.svg", alt: "", width: 56, height: 56 }), h("h1", hi ? "मंज़ूरी का इंतज़ार" : "Waiting for approval"),
    h("p", { style: { textAlign: "center" } }, msg), h("small", ctx.user?.email || ""),
    h("button.primary.wide", { onclick: () => location.reload() }, hi ? "फिर जाँचें" : "Check again"),
    h("button.ghost", { onclick: () => ctx.store.signOut() }, t("sign_out")))));
}

async function start() {
  root = document.getElementById("app"); root.classList.remove("boot"); applyTheme(getTheme()); document.documentElement.lang = getLang();
  ctx.store = await createStore(); window.TULIKA_STORE = ctx.store; route = parse(); setupGlobal();
  const boot = async (user) => {
    ctx.user = user; if (!user) return loginView();
    try { ctx.access = await ctx.store.access(); } catch (e) { console.error(e); ctx.access = { ok: false, status: "pending" }; }
    if (!ctx.access.ok) return waitingView(ctx.access);
    buildShell(); await refresh();
  };
  const { user } = await ctx.store.init(); ctx.store.onAuth((u) => boot(u)); await boot(user);
  const q = new URLSearchParams(location.search); if (q.get("new")) newProjectModal(ctx, { app: q.get("new") });
}
start().catch((e) => { console.error(e); document.getElementById("app").textContent = "Error: " + e.message; });

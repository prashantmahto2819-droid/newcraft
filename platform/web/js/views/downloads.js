import { h, icon, toast } from "../ui.js";
import { t } from "../i18n.js";
import { APPS, RELEASES_URL, REPO_URL } from "../data/catalog.js";
import { appIcon } from "./shared.js";

export const detectOS = () => { const u = (navigator.userAgentData?.platform || navigator.platform || "") + " " + navigator.userAgent; return /win/i.test(u) ? "Windows" : /mac|iphone|ipad/i.test(u) ? "macOS" : /android/i.test(u) ? "Android" : /linux|x11/i.test(u) ? "Linux" : "Windows"; };

export async function render(ctx) {
  const os = detectOS();
  const pwa = window.__pwaPrompt ? h("button.primary", { onclick: async () => { window.__pwaPrompt.prompt(); await window.__pwaPrompt.userChoice; window.__pwaPrompt = null; ctx.rerender(); } }, icon("download", 18), t("install_pwa")) : null;
  return h("div.view", h("div.page-head", h("div", h("h1", t("downloads_title")), h("p.sub", t("downloads_sub")))),
    h("div.tiles", Object.keys(APPS).map((k) => h("section.card.dl", appIcon(k, 46), h("b", APPS[k].name), h("small", t(APPS[k].descKey)),
      h("a.primary", { href: RELEASES_URL + "/latest", target: "_blank", rel: "noopener" }, icon("download", 18), `${t("recommended")}: ${os}`),
      APPS[k].web ? h("a.ghost", { href: APPS[k].web, target: "_blank", rel: "noopener" }, icon("ext", 16), t("open_web")) : h("span.badge", t("desktop_app")))),),
    h("section.card", h("div.card-head", h("h2", "Windows · macOS · Linux")), h("div.btnrow", h("a.ghost", { href: RELEASES_URL, target: "_blank", rel: "noopener" }, icon("ext", 16), t("all_releases")), h("a.ghost", { href: REPO_URL + "/blob/main/docs/BUILDING.md", target: "_blank", rel: "noopener" }, icon("box", 16), t("build_source")))),
    h("section.card", h("div.card-head", h("h2", t("install_pwa"))), h("p.sub", t("pwa_hint")), pwa || h("small", "Browser menu → “Install app” / “Add to Home screen”")));
}

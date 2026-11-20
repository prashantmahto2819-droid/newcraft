import { t } from "./i18n.js";

// h("div.card#id", {onclick, class, style:{}}, ...children)
export function h(sel, attrs, ...kids) {
  const m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel);
  const el = document.createElement(m[1] || "div");
  for (const p of (m[2].match(/[.#][\w-]+/g) || [])) p[0] === "." ? el.classList.add(p.slice(1)) : (el.id = p.slice(1));
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "class") v.split(" ").forEach((c) => c && el.classList.add(c));
    else if (k === "value" || k === "checked" || k === "disabled") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(3)) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

const P = {
  home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z", folder: "M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", palette: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.6-2-.5-1.2.3-2.5 1.6-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5zM7.5 11a1 1 0 1 0 0-.01M11 7a1 1 0 1 0 0-.01M16 8a1 1 0 1 0 0-.01",
  download: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16", settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3", plus: "M12 5v14M5 12h14", star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  list: "M4 6h16M4 12h16M4 18h16", upload: "M12 21V9m0 0l-4 4m4-4l4 4M4 5h16", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3", edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  more: "M5 12a1 1 0 1 0 0-.01M12 12a1 1 0 1 0 0-.01M19 12a1 1 0 1 0 0-.01", sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", ext: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5", copy: "M9 9h11v11H9zM5 15V5a1 1 0 0 1 1-1h10",
  check: "M5 12l5 5L20 7", x: "M6 6l12 12M18 6L6 18", logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9", help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 17.5v.01",
  wand: "M15 4V2M15 10V8M12 7h-2M20 7h-2M4 20L17 7l2 2L6 22zM18 14v-2", image: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-.01M21 16l-5-5L5 21",
  cloud: "M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 11a3.5 3.5 0 0 1-.5 7z", box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
};
export function icon(name, size = 20, fill = false) {
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size); s.setAttribute("aria-hidden", "true");
  s.setAttribute("fill", fill ? "currentColor" : "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.9"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", P[name] || P.box); s.append(p); return s;
}

export function toast(msg, kind = "ok") {
  let box = document.getElementById("toasts"); if (!box) { box = h("div#toasts", { role: "status", "aria-live": "polite" }); document.body.append(box); }
  const el = h("div.toast." + kind, icon(kind === "err" ? "x" : "check", 18), msg); box.append(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 300); }, 2800);
}

export function modal({ title, body, actions = [], wide = false }) {
  const close = () => { back.remove(); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  const foot = h("div.modal-foot");
  for (const a of actions) foot.append(h("button." + (a.kind || "ghost"), { onclick: async () => { if ((await a.run?.(close)) !== false && !a.keep) close(); } }, a.label));
  const back = h("div.backdrop", { onclick: (e) => e.target === back && close() },
    h("div.modal" + (wide ? ".wide" : ""), { role: "dialog", "aria-modal": "true", "aria-label": title },
      h("div.modal-head", h("h3", title), h("button.icon-btn", { "aria-label": "close", onclick: close }, icon("x"))), h("div.modal-body", body), actions.length ? foot : null));
  document.body.append(back); document.addEventListener("keydown", onKey);
  back.querySelector("input,select,textarea,button.primary")?.focus();
  return close;
}
export const confirmBox = (msg) => new Promise((res) => modal({ title: msg, body: "", actions: [{ label: t("cancel"), run: () => res(false) }, { label: t("delete"), kind: "danger", run: () => res(true) }] }));

export function menu(anchor, items) {
  document.querySelectorAll(".popmenu").forEach((m) => m.remove());
  const m = h("div.popmenu", { role: "menu" }, items.map((it) => it === "-" ? h("hr") : h("button", { role: "menuitem", class: it.danger ? "danger" : "", onclick: () => { m.remove(); it.run(); } }, icon(it.icon, 17), it.label)));
  document.body.append(m);
  const r = anchor.getBoundingClientRect(); const w = m.offsetWidth, hh = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px"; m.style.top = Math.min(innerHeight - hh - 8, r.bottom + 6) + "px";
  setTimeout(() => document.addEventListener("click", () => m.remove(), { once: true }), 0);
}
export const debounce = (fn, ms = 150) => { let id; return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); }; };
export function downloadBlob(name, blob) { const a = h("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

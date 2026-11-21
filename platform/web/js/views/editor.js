// Template editor: every template is a plain JSON design (js/data/designs.js) that can be fully edited in the browser:
// move / resize / restyle / delete any layer, add text and shapes, change fonts and colours, undo/redo, autosave,
// then export PNG / SVG / PDF or keep it as a project. Fonts are embedded in the exported SVG and PNG.
import { h, icon, toast, downloadBlob } from "../ui.js";
import { getLang } from "../i18n.js";
import { TEMPLATES } from "../data/catalog.js";
import { buildDesign, designSvg, embedFontCss, loadDeco, FONT_LIST } from "../data/designs.js";
import { jpegsToPdf, canvasJpeg } from "../tools/pdf.js";
import { tplName, guard } from "./shared.js";
import { fontButton } from "./fontpicker.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);
const KEY = (id) => "tulika-design-" + id;
const clone = (o) => JSON.parse(JSON.stringify(o));
const PXU = { px: 1, mm: 300 / 25.4, in: 300, ft: 3600 }, PTU = { px: 0.75, mm: 72 / 25.4, in: 72, ft: 864 };
const rid = () => "n" + Math.random().toString(36).slice(2, 8);

export async function render(ctx) {
  const tplId = new URLSearchParams(location.hash.split("?")[1] || "").get("tpl");
  const tp = TEMPLATES.find((x) => x.id === tplId);
  if (!tp) { location.hash = "#/templates"; return h("div"); }
  loadDeco();
  let d; try { d = JSON.parse(localStorage.getItem(KEY(tp.id))); } catch { d = null; }
  if (!d || d.v !== 1) d = buildDesign(tp);
  let sel = null, hist = [clone(d)], hi = 0, projectId = d.projectId || null, drag = null, raf = 0;

  const canvas = h("div.edcanvas"); const panel = h("aside.edpanel"); const layersBox = h("div.edlayers");
  const persist = () => { try { localStorage.setItem(KEY(tp.id), JSON.stringify({ ...d, projectId })); } catch {} };
  const commit = () => { hist = hist.slice(0, hi + 1); hist.push(clone(d)); if (hist.length > 80) hist.shift(); hi = hist.length - 1; persist(); };
  const undo = () => { if (hi > 0) { d = clone(hist[--hi]); persist(); draw(); panelRender(); } };
  const redo = () => { if (hi < hist.length - 1) { d = clone(hist[++hi]); persist(); draw(); panelRender(); } };
  const layer = () => d.layers.find((l) => l.id === sel);

  let guides = [];
  function draw() {
    canvas.innerHTML = designSvg(d, { id: "ed" }); const svg = canvas.firstChild; svg.removeAttribute("width"); svg.removeAttribute("height"); svg.style.cssText = "width:100%;height:auto;display:block;touch-action:none;user-select:none";
    const l = layer(); const el = l && svg.querySelector(`[data-id="${l.id}"]`);
    if (el) {
      const b = el.getBBox(), pad = 8, ns = "http://www.w3.org/2000/svg";
      const r = document.createElementNS(ns, "rect"); r.setAttribute("x", b.x - pad); r.setAttribute("y", b.y - pad); r.setAttribute("width", b.width + 2 * pad); r.setAttribute("height", b.height + 2 * pad); r.setAttribute("fill", "none"); r.setAttribute("stroke", "#14b8a6"); r.setAttribute("stroke-width", "3"); r.setAttribute("stroke-dasharray", "10 7"); r.setAttribute("pointer-events", "none");
      const hd = document.createElementNS(ns, "circle"); hd.setAttribute("cx", b.x + b.width + pad); hd.setAttribute("cy", b.y + b.height + pad); hd.setAttribute("r", 14); hd.setAttribute("fill", "#14b8a6"); hd.setAttribute("stroke", "#fff"); hd.setAttribute("stroke-width", "3"); hd.dataset.handle = "1"; hd.style.cursor = "nwse-resize";
      svg.append(r); if (!l.lock) svg.append(hd);
    }
    for (const [a, v] of guides) { const g = document.createElementNS("http://www.w3.org/2000/svg", "line"); g.setAttribute(a === "x" ? "x1" : "y1", v); g.setAttribute(a === "x" ? "x2" : "y2", v); g.setAttribute(a === "x" ? "y2" : "x2", a === "x" ? d.H : d.W); g.setAttribute(a === "x" ? "y1" : "x1", 0); g.setAttribute("stroke", "#f43f8e"); g.setAttribute("stroke-width", "2"); g.setAttribute("pointer-events", "none"); g.setAttribute("class", "edguide"); svg.append(g); }
    layersRender();
  }
  const pt = (ev) => { const svg = canvas.firstChild, m = svg.getScreenCTM().inverse(), p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; const q = p.matrixTransform(m); return [q.x, q.y]; };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  canvas.addEventListener("pointerdown", (ev) => {
    const hdl = ev.target.closest("[data-handle]"), t = ev.target.closest("[data-id]");
    if (hdl && layer()) { const l = layer(), c = centerOf(l), p = pt(ev); drag = { mode: "size", l, c, d0: Math.hypot(p[0] - c[0], p[1] - c[1]) || 1, s0: { size: l.size, r: l.r, w: l.w, h: l.h, x: l.x, y: l.y } }; canvas.setPointerCapture(ev.pointerId); return; }
    if (t) { sel = t.dataset.id; const l = layer(), p = pt(ev); drag = { mode: "move", l, p0: p, s0: l.t === "poly" ? clone(l.points) : { x: l.x, y: l.y }, moved: false }; canvas.setPointerCapture(ev.pointerId); draw(); panelRender(); }
    else { sel = null; draw(); panelRender(); }
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return; const p = pt(ev), l = drag.l;
    if (drag.mode === "move") { const dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1]; drag.moved = true; if (l.t === "poly") l.points = drag.s0.map(([x, y]) => [x + dx, y + dy]); else if (l.t === "path") { l.dx = dx; l.dy = dy; } else { l.x = Math.round(drag.s0.x + dx); l.y = Math.round(drag.s0.y + dy); guides = []; if (!ev.altKey) { const hw = l.t === "rect" ? l.w / 2 : 0, hh = l.t === "rect" ? l.h / 2 : 0, T = d.W * 0.012; if ((l.t !== "text" || (l.anchor || "middle") === "middle") && Math.abs(l.x + hw - d.W / 2) < T) { l.x = Math.round(d.W / 2 - hw); guides.push(["x", d.W / 2]); } if (Math.abs(l.y + hh - d.H / 2) < T) { l.y = Math.round(d.H / 2 - hh); guides.push(["y", d.H / 2]); } } } }
    else { const k = Math.max(0.1, Math.hypot(p[0] - drag.c[0], p[1] - drag.c[1]) / drag.d0), s = drag.s0; if (l.t === "text") l.size = Math.max(6, Math.round(s.size * k)); else if (l.t === "circle" || l.t === "ring") l.r = Math.max(3, Math.round(s.r * k)); else if (l.t === "rect") { l.w = Math.max(4, Math.round(s.w * k)); l.h = Math.max(4, Math.round(s.h * k)); l.x = Math.round(s.x + (s.w - l.w) / 2); l.y = Math.round(s.y + (s.h - l.h) / 2); } }
    schedule();
  });
  const end = () => { if (!drag) return; const was = drag; drag = null; if (guides.length) { guides = []; draw(); } if (was.mode === "size" || was.moved) { commit(); panelRender(); } };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("dblclick", () => panel.querySelector("textarea")?.focus());
  function centerOf(l) { if (l.t === "rect") return [l.x + l.w / 2, l.y + l.h / 2]; return [l.x ?? 0, l.y ?? 0]; }

  const keys = (ev) => {
    if (!canvas.isConnected) return removeEventListener("keydown", keys);
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || "")) return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); redo(); }
    else if ((ev.key === "Delete" || ev.key === "Backspace") && sel) { ev.preventDefault(); del(); }
    else if (sel && ev.key.startsWith("Arrow")) { const l = layer(), s = ev.shiftKey ? 20 : 4; if (l && l.x != null && !l.lock) { ev.preventDefault(); if (ev.key === "ArrowLeft") l.x -= s; if (ev.key === "ArrowRight") l.x += s; if (ev.key === "ArrowUp") l.y -= s; if (ev.key === "ArrowDown") l.y += s; commit(); draw(); } }
  };
  addEventListener("keydown", keys);

  function del() { d.layers = d.layers.filter((l) => l.id !== sel); sel = null; commit(); draw(); panelRender(); }
  function dup() { const l = layer(); if (!l) return; const c = clone(l); c.id = rid(); if (c.x != null) { c.x += 24; c.y += 24; } d.layers.push(c); sel = c.id; commit(); draw(); panelRender(); }
  function order(dir) { const i = d.layers.findIndex((l) => l.id === sel); const j = i + dir; if (i < 0 || j < 0 || j >= d.layers.length) return; [d.layers[i], d.layers[j]] = [d.layers[j], d.layers[i]]; commit(); draw(); }
  function addPhoto() {
    const inp = h("input", { type: "file", accept: "image/*" });
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return; let bmp; try { bmp = await createImageBitmap(f); } catch { alert(L("यह फ़ोटो खुल नहीं सकी। JPG या PNG चुनिए।", "This photo could not be opened. Choose a JPG or PNG.")); return; } const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
      const img = /png|webp|gif|svg/.test(f.type) ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", 0.88);
      const w = Math.round(d.W * 0.6), hh = Math.round(w * cv.height / cv.width), id = rid();
      d.layers.push({ id, t: "rect", img, x: Math.round((d.W - w) / 2), y: Math.round((d.H - hh) / 2), w, h: hh, fill: "#ffffff", op: 1, rx: 0 }); sel = id; commit(); draw(); panelRender();
    }; inp.click();
  }
  function add(kind) {
    const W = d.W, H = d.H, id = rid(); let l;
    if (kind === "text") l = { id, t: "text", text: L("यहाँ लिखें", "Type here"), x: W / 2, y: H / 2, size: Math.round(Math.min(W, H) * 0.1), fill: "#111827", font: "Noto Sans Devanagari", weight: 700, op: 1, rot: 0 };
    else if (kind === "rect") l = { id, t: "rect", x: W * 0.25, y: H * 0.4, w: W * 0.5, h: H * 0.2, fill: "#14b8a6", op: 1, rx: 12 };
    else if (kind === "circle") l = { id, t: "circle", x: W / 2, y: H / 2, r: Math.min(W, H) * 0.15, fill: "#f59e0b", op: 1 };
    else l = { id, t: "ring", x: W / 2, y: H / 2, r: Math.min(W, H) * 0.2, stroke: "#ffffff", sw: 8, op: 1 };
    d.layers.push(l); sel = id; commit(); draw(); panelRender();
  }

  // ---- side panel
  const row = (label, ...c) => h("label.fld", label, ...c);
  const colour = (val, fn) => h("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(val) ? val : "#000000", oninput: (e) => { fn(e.target.value); draw(); }, onchange: commit });
  const range = (min, max, val, fn, step = 1) => h("input", { type: "range", min, max, step, value: val, oninput: (e) => { fn(+e.target.value); schedule(); }, onchange: commit });
  const name = (l) => l.img ? L("फ़ोटो", "Photo") : l.t === "text" ? String(l.text).split("\n")[0].slice(0, 22) || "…" : { rect: L("आयत", "Rectangle"), circle: L("गोला", "Circle"), ring: L("रिंग", "Ring"), poly: L("आकार", "Shape"), path: L("लहर", "Wave") }[l.t];
  function layersRender() {
    layersBox.textContent = "";
    for (const l of [...d.layers].reverse()) layersBox.append(h("button.edlayer" + (l.id === sel ? ".on" : ""), { type: "button", onclick: () => { sel = l.id; draw(); panelRender(); } }, h("small", l.t === "text" ? "T" : l.t === "rect" ? "▭" : l.t === "circle" ? "●" : l.t === "ring" ? "◯" : "◆"), h("span", { style: "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" + (l.hid ? ";opacity:.45" : "") }, name(l)),
      h("span.edtog", { title: L("ताला", "Lock"), onclick: (e) => { e.stopPropagation(); l.lock = !l.lock; commit(); draw(); } }, l.lock ? "🔒" : "🔓"),
      h("span.edtog", { title: L("दिखाएँ/छुपाएँ", "Show/hide"), onclick: (e) => { e.stopPropagation(); l.hid = !l.hid; commit(); draw(); } }, l.hid ? "🚫" : "👁")));
  }
  function nudge(l, dx, dy) { if (l.t === "poly") l.points = l.points.map(([x, y]) => [x + dx, y + dy]); else if (l.t === "path") { l.dx = (l.dx || 0) + dx; l.dy = (l.dy || 0) + dy; } else { l.x = Math.round(l.x + dx); l.y = Math.round(l.y + dy); } }
  function align(k) {
    const l = layer(), el = canvas.querySelector(`[data-id="${l?.id}"]`); if (!l || !el) return; const b = el.getBBox(); let dx = 0, dy = 0;
    if (k === "l") dx = 0 - b.x; if (k === "c") dx = d.W / 2 - (b.x + b.width / 2); if (k === "r") dx = d.W - (b.x + b.width);
    if (k === "t") dy = 0 - b.y; if (k === "m") dy = d.H / 2 - (b.y + b.height / 2); if (k === "b") dy = d.H - (b.y + b.height);
    nudge(l, dx, dy); commit(); draw();
  }
  function panelRender() {
    const l = layer(); panel.textContent = "";
    panel.append(
      h("section.card", h("h3", L("पृष्ठभूमि", "Background")), h("div.grid2", row(L("रंग 1", "Colour 1"), colour(d.bg[0], (v) => (d.bg[0] = v))), row(L("रंग 2", "Colour 2"), colour(d.bg[1], (v) => (d.bg[1] = v)))), row(L("ढलान", "Angle"), range(0, 360, d.bg[2] ?? 135, (v) => (d.bg[2] = v)))),
      h("section.card", h("h3", L("जोड़ें", "Add")), h("div.btnrow", [["text", "T " + L("टेक्स्ट", "Text")], ["rect", "▭"], ["circle", "●"], ["ring", "◯"]].map(([k, lb]) => h("button.ghost", { onclick: () => add(k) }, lb)).concat(h("button.ghost", { title: L("फ़ोटो जोड़ें", "Add photo"), onclick: addPhoto }, "🖼")))),
    );
    if (l) {
      const f = [];
      if (l.t === "text") f.push(
        row(L("लिखावट", "Text"), h("textarea", { rows: 3, value: l.text, oninput: (e) => { l.text = e.target.value; schedule(); }, onchange: commit })),
        row(L("फ़ॉन्ट (" + FONT_LIST.length + ")", "Font (" + FONT_LIST.length + ")"), fontButton(l.font, (f) => { l.font = f; commit(); draw(); })),
        row(L("आकार", "Size"), range(8, Math.max(400, l.size), l.size, (v) => (l.size = v))),
        h("div.grid2", row(L("रंग", "Colour"), colour(l.fill, (v) => (l.fill = v))), row(L("किनारा", "Outline"), colour(l.stroke || "#000000", (v) => { l.stroke = v; l.sw ||= 6; }))),
        h("div.btnrow", h("button.ghost", { onclick: () => { l.weight = l.weight >= 700 ? 400 : 700; commit(); draw(); } }, "B"), h("button.ghost", { onclick: () => { l.anchor = "start"; l.x = Math.round(d.W * 0.08); commit(); draw(); } }, "⇤"), h("button.ghost", { onclick: () => { l.anchor = "middle"; l.x = Math.round(d.W / 2); commit(); draw(); } }, "↔"), h("button.ghost", { onclick: () => { l.anchor = "end"; l.x = Math.round(d.W * 0.92); commit(); draw(); } }, "⇥")),
        h("div.btnrow", h("button.ghost", { title: L("तिरछा", "Italic"), style: "font-style:italic", onclick: () => { l.it = !l.it; commit(); draw(); } }, "I"), h("button.ghost", { title: L("रेखांकित", "Underline"), style: "text-decoration:underline", onclick: () => { l.ul = !l.ul; commit(); draw(); } }, "U")),
        h("div.grid2", row(L("अक्षर दूरी", "Letter spacing"), range(-5, 60, l.ls || 0, (v) => (l.ls = v))), row(L("पंक्ति दूरी", "Line spacing"), range(0.8, 2.5, l.lh || 1.2, (v) => (l.lh = v), 0.05))),
        row(L("घुमाव", "Rotate"), range(-180, 180, l.rot || 0, (v) => (l.rot = v))));
      else if (l.t === "ring") f.push(row(L("रंग", "Colour"), colour(l.stroke, (v) => (l.stroke = v))), row(L("मोटाई", "Thickness"), range(1, 60, l.sw || 4, (v) => (l.sw = v))), row(L("आकार", "Size"), range(5, 900, l.r, (v) => (l.r = v))));
      else if (l.t === "rect" || l.t === "circle") f.push(row(L("रंग", "Colour"), colour(l.fill === "none" ? "#ffffff" : l.fill, (v) => (l.fill = v))), l.t === "circle" ? row(L("आकार", "Size"), range(5, 900, l.r, (v) => (l.r = v))) : h("div.grid2", row(L("चौड़ाई", "Width"), range(5, d.W * 1.2, l.w, (v) => (l.w = v))), row(L("ऊँचाई", "Height"), range(5, d.H * 1.2, l.h, (v) => (l.h = v)))), l.t === "rect" ? row(L("गोलाई", "Corners"), range(0, 200, l.rx || 0, (v) => (l.rx = v))) : null);
      else f.push(row(L("रंग", "Colour"), colour(l.fill, (v) => (l.fill = v))));
      if (l.t !== "ring") f.push(h("div.grid2", row(L("ग्रेडिएंट", "Gradient"), h("input", { type: "checkbox", checked: !!l.g2, onchange: (e) => { l.g2 = e.target.checked ? (l.g2 || "#ffffff") : null; commit(); draw(); panelRender(); } })), l.g2 ? row(L("रंग 2", "Colour 2"), colour(l.g2, (v) => (l.g2 = v))) : null), l.g2 ? row(L("कोण", "Angle"), range(0, 360, l.ga ?? 90, (v) => (l.ga = v))) : null);
      f.push(row(L("छाया", "Shadow"), h("input", { type: "checkbox", checked: !!l.sh, onchange: (e) => { l.sh = e.target.checked ? { c: "#000000", b: 14, x: 6, y: 8, o: 0.5 } : null; commit(); draw(); panelRender(); } })),
        l.sh ? h("div.grid2", row(L("छाया रंग", "Shadow colour"), colour(l.sh.c, (v) => (l.sh.c = v))), row(L("धुंधलापन", "Blur"), range(0, 60, l.sh.b, (v) => (l.sh.b = v)))) : null,
        h("div.btnrow", [["⇤", "l"], ["↔", "c"], ["⇥", "r"], ["⤒", "t"], ["↕", "m"], ["⤓", "b"]].map(([lb, k]) => h("button.ghost", { title: L("पेज के हिसाब से संरेखित", "Align to page") + " " + k, onclick: () => align(k) }, lb))),
        row(L("पारदर्शिता", "Opacity"), range(0.05, 1, l.op ?? 1, (v) => (l.op = v), 0.05)),
        h("div.btnrow", h("button.ghost", { onclick: dup, title: "Duplicate" }, icon("copy", 16)), h("button.ghost", { onclick: () => order(1), title: "Forward" }, "↑"), h("button.ghost", { onclick: () => order(-1), title: "Backward" }, "↓"), h("button.danger", { onclick: del }, icon("trash", 16))));
      panel.append(h("section.card", h("h3", L("चुना हुआ", "Selected")), ...f));
    } else panel.append(h("section.card", h("small", L("किसी भी चीज़ पर क्लिक कीजिए, खींचकर हिलाइए, कोने के गोले से बड़ा/छोटा कीजिए।", "Click anything, drag to move, use the corner dot to resize."))));
    panel.append(h("section.card", h("h3", L("परतें", "Layers")), layersBox)); layersRender();
  }

  // ---- export
  async function svgFile() { const css = await embedFontCss(d); return designSvg(d, { fontCss: css, id: "x" }); }
  async function raster(type) {
    await document.fonts.ready; const svg = await svgFile();
    const k = PXU[d.unit] || 1; let w = Math.round(d.w * k), hh = Math.round(d.h * k); const cap = Math.min(1, 6000 / Math.max(w, hh)); w = Math.round(w * cap); hh = Math.round(hh * cap);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })); const img = new Image(); img.width = w; img.height = hh;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const cv = document.createElement("canvas"); cv.width = w; cv.height = hh; const x = cv.getContext("2d"); x.drawImage(img, 0, 0, w, hh); URL.revokeObjectURL(url);
    return { cv, w, h: hh };
  }
  const fname = () => tplName(tp).replace(/[\\/:*?"<>|\s]+/g, "_");
  const exportPng = () => guard(async () => { toast(L("बन रहा है…", "Rendering…")); const { cv } = await raster(); cv.toBlob((b) => downloadBlob(fname() + ".png", b), "image/png"); });
  const exportSvg = () => guard(async () => downloadBlob(fname() + ".svg", new Blob([await svgFile()], { type: "image/svg+xml" })));
  const exportPdf = () => guard(async () => { toast(L("बन रहा है…", "Rendering…")); const { cv, w, h: hh } = await raster(); const pw = d.w * (PTU[d.unit] || 0.75), ph = d.h * (PTU[d.unit] || 0.75); downloadBlob(fname() + ".pdf", jpegsToPdf([{ jpeg: await canvasJpeg(cv, 0.93), w, h: hh, pw, ph, x: 0, y: 0, iw: pw, ih: ph }])); });
  const keep = () => guard(async () => {
    const file = new File([await svgFile()], fname() + ".svg", { type: "image/svg+xml" });
    if (projectId && ctx.projects.some((p) => p.id === projectId)) await ctx.store.attachFile(projectId, file);
    else { const p = await ctx.store.createProject({ app: "vector", name: tplName(tp), meta: { template: tp.id, w: d.w, h: d.h, unit: d.unit } }); projectId = p.id; await ctx.store.attachFile(p.id, file); }
    persist(); await ctx.refresh(); toast(L("प्रोजेक्ट में सेव हो गया ✓", "Saved to projects ✓"));
  });

  draw(); panelRender();
  return h("div.view.editor",
    h("div.page-head", h("div", h("h1", tplName(tp)), h("p.sub", `${tp.w}×${tp.h} ${tp.unit}`)),
      h("div.btnrow", h("a.ghost", { href: "#/templates" }, "← " + L("टेम्पलेट", "Templates")), h("button.ghost", { onclick: undo, title: "Ctrl+Z" }, "↶"), h("button.ghost", { onclick: redo, title: "Ctrl+Y" }, "↷"),
        h("button.ghost", { onclick: () => { d = buildDesign(tp); sel = null; commit(); draw(); panelRender(); } }, L("रीसेट", "Reset")),
        h("button.primary", { onclick: exportPng }, icon("download", 16), "PNG"), h("button.ghost", { onclick: exportPdf }, "PDF"), h("button.ghost", { onclick: exportSvg }, "SVG"), h("button.ghost", { onclick: keep }, icon("folder", 16), L("प्रोजेक्ट में रखें", "Keep in projects")))),
    h("div.edwrap", h("div.edstage", canvas), panel));
}

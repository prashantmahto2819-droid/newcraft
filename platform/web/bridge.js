// Tulika bridge: lets the web apps (/vector/, /photo/, /pdf/) open and save dashboard projects.
// Loaded by each app's index.html as <script type="module" src="../bridge.js">. Active only when the URL has ?project=<id>.
// Same origin as the dashboard, so it uses the same store (Supabase session or the demo store).
//
// Open : store.fileBlob(id) -> window.<app>craft.openFile(name, bytes) when the app has it (vector), otherwise a synthetic drop on the canvas.
// Save : every browser download the app makes is noticed (blob: links). A save of the same file name as the opened one goes to the cloud
//        automatically; any other file (an export) shows a button "Keep in cloud". The download itself still happens.
const params = new URLSearchParams(location.search);
const projectId = params.get("project");
const appKey = (location.pathname.match(/\/(vector|photo|pdf|film)\/?[^/]*$/) || [])[1] || "";

const hi = (navigator.language || "").toLowerCase().startsWith("hi") || params.get("lang") === "hi";
const T = (h, e) => (hi ? h : e);

const recorded = new Map(); // blob: url -> Blob
if (projectId) {
  const create = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (obj) => { const u = create(obj); if (obj instanceof Blob) recorded.set(u, obj); return u; };
}

function pill() {
  const el = document.createElement("div");
  el.id = "tulika-bridge";
  el.style.cssText = "position:fixed;z-index:99999;left:50%;bottom:calc(10px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);max-width:94vw;display:flex;gap:8px;align-items:center;padding:7px 12px;border-radius:999px;background:#1f2937;color:#f9fafb;font:13px system-ui,sans-serif;box-shadow:0 4px 18px #0006;opacity:.96";
  document.body.append(el);
  return el;
}

async function main() {
  if (!projectId) return;
  if (!window.TULIKA_CONFIG) {
    await new Promise((res) => { const s = document.createElement("script"); s.src = new URL("../config.js", import.meta.url); s.onload = s.onerror = res; document.head.append(s); });
  }
  const bar = pill();
  const say = (text, ...extra) => { bar.textContent = ""; const sp = document.createElement("span"); sp.textContent = text; bar.append(sp, ...extra); };
  const btn = (label, fn) => { const b = document.createElement("button"); b.textContent = label; b.style.cssText = "border:0;border-radius:999px;padding:4px 10px;background:#14b8a6;color:#04201c;font:600 12px system-ui;cursor:pointer"; b.onclick = fn; return b; };
  const back = () => btn(T("डैशबोर्ड", "Dashboard"), () => { location.href = new URL("../#/projects", location.href).href; });

  let store, project;
  try {
    const { createStore } = await import("./js/store.js");
    store = await createStore();
    const { user } = await store.init();
    if (!user) { say(T("क्लाउड में सेव के लिए पहले डैशबोर्ड पर साइन इन करें", "Sign in on the dashboard to use cloud save"), back()); return; }
    project = (await store.listProjects()).find((p) => p.id === projectId);
  } catch (e) { console.error(e); say(T("क्लाउड से जुड़ नहीं सका", "Could not reach the cloud")); return; }
  if (!project) { say(T("प्रोजेक्ट नहीं मिला", "Project not found"), back()); return; }

  let openedName = project.file_name || null;
  const status = (msg) => say(`☁ ${project.name} · ${msg}`, back());
  status(T("खुल रहा है…", "opening…"));

  const upload = async (name, blob) => {
    status(T("सेव हो रहा है…", "saving…"));
    try { await store.attachFile(projectId, new File([blob], name, { type: blob.type })); openedName = name; status(T("क्लाउड में सेव ✓", "saved to cloud ✓")); }
    catch (e) { console.error(e); status(T("सेव नहीं हुआ", "save failed")); }
  };

  // Notice downloads made by the app.
  document.addEventListener("click", (ev) => {
    const a = ev.target instanceof Element ? ev.target.closest("a[download]") : null;
    if (!a) return;
    grab(a);
  }, true);
  const nativeClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { try { if (this.download) grab(this); } catch {} return nativeClick.apply(this, arguments); };
  function grab(a) {
    const blob = recorded.get(a.href); if (!blob) return;
    const name = a.download || "file";
    if (name === openedName || !openedName) upload(name, blob);
    else say(`☁ ${project.name} · ${name}`, btn(T("क्लाउड में रखें", "Keep in cloud"), () => upload(name, blob)), back());
  }

  // Open the stored file once the app is ready.
  let f = null;
  try { f = await store.fileBlob(projectId); } catch (e) { console.error(e); }
  if (!f) { status(T("नया प्रोजेक्ट", "new project")); return; }
  const bytes = new Uint8Array(await f.blob.arrayBuffer());
  const api = () => window[appKey + "craft"];
  for (let i = 0; i < 240; i++) {
    if (typeof api()?.openFile === "function") { try { await api().openFile(f.name, bytes); openedName = f.name; status(T("खुल गया ✓", "opened ✓")); return; } catch { /* fall through to drop */ } }
    const canvas = document.querySelector("canvas");
    if (canvas && i > 8 && typeof api()?.openFile !== "function") { // no openFile API (photo, pdf): hand the file to the canvas as a drop
      const dt = new DataTransfer(); dt.items.add(new File([bytes], f.name, { type: f.blob.type }));
      for (const type of ["dragenter", "dragover", "drop"]) canvas.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
      openedName = f.name; status(T("खुल गया ✓", "opened ✓")); return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  status(T("ऐप तैयार नहीं हुआ — फ़ाइल डाउनलोड कर के खोलें", "app not ready — download the file and open it manually"));
}
main();

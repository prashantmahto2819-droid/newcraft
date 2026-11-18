import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const $ = (id) => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle("hidden", !on);
const COLORS = { vector: "#14b8a6", photo: "#f43f8e", film: "#8b5cf6", pdf: "#f59e0b" };
const NAMES = { vector: "Vector", photo: "Photo", film: "Film", pdf: "PDF" };
const cfg = window.TULIKA_CONFIG || {};

if (!cfg.supabaseUrl || cfg.supabaseUrl.includes("YOUR-PROJECT")) {
  show("setup", true);
  show("home", true); // the app links still work without an account
} else {
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  async function render(session) {
    show("login", !session); show("home", !!session); show("userbox", !!session);
    if (!session) return;
    $("who").textContent = session.user.email;
    const { data, error } = await sb.from("projects").select("id,name,app,updated_at").order("updated_at", { ascending: false }).limit(50);
    const rows = $("rows"); rows.textContent = "";
    if (error) { $("empty").textContent = "प्रोजेक्ट लोड नहीं हो सके: " + error.message; $("empty").style.display = "block"; return; }
    $("empty").style.display = data.length ? "none" : "block";
    for (const p of data) {
      const tr = document.createElement("tr");
      const name = document.createElement("td"); name.textContent = p.name;
      const app = document.createElement("td"); const tag = document.createElement("span");
      tag.className = "tag"; tag.style.background = COLORS[p.app] || "#555"; tag.textContent = NAMES[p.app] || p.app; app.append(tag);
      const when = document.createElement("td"); when.className = "muted"; when.textContent = new Date(p.updated_at).toLocaleString("hi-IN");
      tr.append(name, app, when); rows.append(tr);
    }
  }

  const creds = () => ({ email: $("email").value.trim(), password: $("pass").value });
  $("signin").onclick = async () => { const { error } = await sb.auth.signInWithPassword(creds()); $("err").textContent = error ? error.message : ""; };
  $("signup").onclick = async () => {
    const { error } = await sb.auth.signUp(creds());
    $("err").textContent = error ? error.message : "खाता बन गया। ईमेल की पुष्टि करें (अगर सेटिंग में चालू है)।";
  };
  $("logout").onclick = () => sb.auth.signOut();
  sb.auth.onAuthStateChange((_e, session) => render(session));
  render((await sb.auth.getSession()).data.session);
}

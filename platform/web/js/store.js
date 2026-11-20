// Data layer. Two interchangeable back-ends with the same API:
//  * CloudStore: Supabase (auth + tables + storage) when config.js has real keys.
//  * DemoStore: everything in localStorage, so the dashboard works (and can be tested) without any server.
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
const now = () => new Date().toISOString();
const LIMIT = 1024 ** 3; // 1 GB soft limit shown in the meter

class DemoStore {
  mode = "demo";
  constructor() { this.listeners = []; this.db = this._load(); }
  _load() { try { return JSON.parse(localStorage.getItem("tulika-demo")) || { projects: [], kits: [], files: {} }; } catch { return { projects: [], kits: [], files: {} }; } }
  _save() { try { localStorage.setItem("tulika-demo", JSON.stringify(this.db)); } catch { throw new Error("storage full"); } }
  async init() { return { user: { email: "demo@local", id: "demo" } }; }
  onAuth() {} async signIn() {} async signUp() {} async signOut() {} async resetPassword() {} async magicLink() {}
  async listProjects() { return [...this.db.projects]; }
  async createProject({ app, name, meta = {}, file }) {
    const p = { id: uid(), app, name: name || "", file_name: file?.name || null, size_bytes: file?.size || 0, favorite: false, meta, created_at: now(), updated_at: now() };
    if (file) await this._putFile(p.id, file);
    this.db.projects.unshift(p); this._save(); return p;
  }
  async _putFile(id, file) {
    if (file.size > 1.5 * 1024 * 1024) throw new Error("too_big_demo");
    const data = await new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(file); });
    this.db.files[id] = { name: file.name, type: file.type, data };
  }
  async updateProject(id, patch) { const p = this.db.projects.find((x) => x.id === id); Object.assign(p, patch, { updated_at: now() }); this._save(); return p; }
  async attachFile(id, file) { await this._putFile(id, file); return this.updateProject(id, { file_name: file.name, size_bytes: file.size }); }
  async fileBlob(id) { const f = this.db.files[id]; if (!f) return null; const b = await (await fetch(f.data)).blob(); return { blob: b, name: f.name }; }
  async removeProject(id) { this.db.projects = this.db.projects.filter((p) => p.id !== id); delete this.db.files[id]; this._save(); }
  async duplicateProject(id) { const s = this.db.projects.find((p) => p.id === id); const c = { ...s, id: uid(), name: s.name + " (copy)", favorite: false, created_at: now(), updated_at: now() }; if (this.db.files[id]) this.db.files[c.id] = this.db.files[id]; this.db.projects.unshift(c); this._save(); return c; }
  async listKits() { return [...this.db.kits]; }
  async saveKit(kit) { const i = this.db.kits.findIndex((k) => k.id === kit.id); const k = { id: kit.id || uid(), name: kit.name, colors: kit.colors, fonts: kit.fonts, created_at: kit.created_at || now() }; i >= 0 ? (this.db.kits[i] = k) : this.db.kits.unshift(k); this._save(); return k; }
  async removeKit(id) { this.db.kits = this.db.kits.filter((k) => k.id !== id); this._save(); }
  async usage() { return { bytes: this.db.projects.reduce((s, p) => s + (p.size_bytes || 0), 0), limit: LIMIT }; }
  async exportAll() { return { projects: this.db.projects, kits: this.db.kits }; }
  async reset() { this.db = { projects: [], kits: [], files: {} }; this._save(); }
}

class CloudStore {
  mode = "cloud";
  constructor(sb) { this.sb = sb; }
  async init() { const { data } = await this.sb.auth.getSession(); return { user: data.session?.user || null }; }
  onAuth(cb) { this.sb.auth.onAuthStateChange((_e, s) => cb(s?.user || null)); }
  async signIn(email, password) { const { error } = await this.sb.auth.signInWithPassword({ email, password }); if (error) throw error; }
  async signUp(email, password) { const { error } = await this.sb.auth.signUp({ email, password }); if (error) throw error; }
  async signOut() { await this.sb.auth.signOut(); }
  async resetPassword(email) { const { error } = await this.sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error; }
  async magicLink(email) { const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; }
  async _uid() { return (await this.sb.auth.getUser()).data.user.id; }
  async listProjects() {
    const { data, error } = await this.sb.from("projects").select("id,app,name,file_path,size_bytes,favorite,meta,created_at,updated_at").order("updated_at", { ascending: false }).limit(500);
    if (error) throw error; return data.map((p) => ({ ...p, file_name: p.file_path ? p.file_path.split("/").pop() : null, meta: p.meta || {} }));
  }
  async createProject({ app, name, meta = {}, file }) {
    const owner_id = await this._uid();
    const { data, error } = await this.sb.from("projects").insert({ owner_id, app, name: name || "Untitled", meta }).select().single(); if (error) throw error;
    if (file) return this.attachFile(data.id, file);
    return { ...data, file_name: null };
  }
  async updateProject(id, patch) { const { data, error } = await this.sb.from("projects").update(patch).eq("id", id).select().single(); if (error) throw error; return data; }
  async attachFile(id, file) {
    const owner = await this._uid(); const safe = file.name.replace(/[^\w.\-]+/g, "_"); const path = `${owner}/${id}/${safe}`;
    const up = await this.sb.storage.from("projects").upload(path, file, { upsert: true, contentType: file.type || "application/octet-stream" }); if (up.error) throw up.error;
    const p = await this.updateProject(id, { file_path: path, size_bytes: file.size }); return { ...p, file_name: safe };
  }
  async fileBlob(id) {
    const { data: p } = await this.sb.from("projects").select("file_path").eq("id", id).single(); if (!p?.file_path) return null;
    const { data, error } = await this.sb.storage.from("projects").download(p.file_path); if (error) throw error; return { blob: data, name: p.file_path.split("/").pop() };
  }
  async removeProject(id) {
    const { data: p } = await this.sb.from("projects").select("file_path").eq("id", id).single();
    if (p?.file_path) await this.sb.storage.from("projects").remove([p.file_path]);
    const { error } = await this.sb.from("projects").delete().eq("id", id); if (error) throw error;
  }
  async duplicateProject(id) { const { data: s } = await this.sb.from("projects").select("*").eq("id", id).single(); const c = await this.createProject({ app: s.app, name: s.name + " (copy)", meta: s.meta }); const f = await this.fileBlob(id); return f ? this.attachFile(c.id, new File([f.blob], f.name)) : c; }
  async listKits() { const { data, error } = await this.sb.from("brand_kits").select("*").order("created_at", { ascending: false }); if (error) throw error; return data; }
  async saveKit(kit) { const owner_id = await this._uid(); const row = { name: kit.name, colors: kit.colors, fonts: kit.fonts, owner_id }; const q = kit.id ? this.sb.from("brand_kits").update(row).eq("id", kit.id) : this.sb.from("brand_kits").insert(row); const { data, error } = await q.select().single(); if (error) throw error; return data; }
  async removeKit(id) { const { error } = await this.sb.from("brand_kits").delete().eq("id", id); if (error) throw error; }
  async usage() { const { data } = await this.sb.from("projects").select("size_bytes"); return { bytes: (data || []).reduce((s, p) => s + (p.size_bytes || 0), 0), limit: LIMIT }; }
  async exportAll() { return { projects: await this.listProjects(), kits: await this.listKits() }; }
  async reset() {}
}

export async function createStore() {
  const c = window.TULIKA_CONFIG || {};
  const forceDemo = (() => { try { return localStorage.getItem("tulika-force-demo") === "1" || new URLSearchParams(location.search).has("demo"); } catch { return false; } })();
  if (!forceDemo && c.supabaseUrl && !c.supabaseUrl.includes("YOUR-PROJECT") && c.supabaseAnonKey) {
    try {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      return new CloudStore(createClient(c.supabaseUrl, c.supabaseAnonKey));
    } catch (e) { console.warn("Supabase failed to load, using demo mode", e); }
  }
  return new DemoStore();
}

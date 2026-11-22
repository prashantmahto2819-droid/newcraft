// Admin: every account with its status, plan and validity; approve, block, set a plan and an end date.
// Only admins get rows back (RPC admin_list_users checks on the server); everyone else sees a notice.
import { h, toast } from "../ui.js";
import { getLang, dateFmt } from "../i18n.js";

const L = (hi, en) => (getLang() === "hi" ? hi : en);
export const PLANS = [["free", "Free"], ["monthly", "Monthly"], ["yearly", "Yearly"], ["lifetime", "Lifetime"]];
const DAYS = { monthly: 30, yearly: 365 };
const STATUS = { pending: ["इंतज़ार में", "Pending"], approved: ["मंज़ूर", "Approved"], blocked: ["रोका गया", "Blocked"] };

export async function render(ctx) {
  const wrap = h("div.view", h("div.page-head", h("h1", L("यूज़र और मंज़ूरी", "Users & approval"))));
  if (!ctx.access?.is_admin) { wrap.append(h("div.card", L("यह पेज सिर्फ़ एडमिन के लिए है।", "This page is for admins only."))); return wrap; }
  let users = [];
  try { users = await ctx.store.adminUsers(); } catch (e) { wrap.append(h("div.card", (e && e.message) || "error")); return wrap; }
  let devices = []; try { devices = await ctx.store.adminDevices(); } catch (e) { console.error(e); }
  const pending = users.filter((u) => u.status === "pending").length;
  wrap.append(h("p", { id: "admin-summary" }, L(`कुल ${users.length} खाते · ${pending} मंज़ूरी के इंतज़ार में`, `${users.length} accounts · ${pending} waiting for approval`)));
  const set = (u, patch) => async () => {
    try { await ctx.store.adminSet(u.id, { status: u.status, plan: u.plan, valid_until: u.valid_until, ...patch }); toast(L("सेव हो गया", "Saved")); ctx.rerender(); }
    catch (e) { toast((e && e.message) || "error", "err"); }
  };
  const until = (plan) => (DAYS[plan] ? new Date(Date.now() + DAYS[plan] * 86400000).toISOString() : null);
  const list = h("div.adminlist");
  for (const u of users) {
    const me = u.id === ctx.user?.id;
    const plan = h("select", { "aria-label": L("प्लान", "Plan"), onchange: (e) => set(u, { plan: e.target.value, valid_until: until(e.target.value) })() }, PLANS.map(([v, l]) => h("option", { value: v, selected: u.plan === v }, l)));
    const date = h("input", { type: "date", "aria-label": L("कब तक मान्य", "Valid until"), value: u.valid_until ? u.valid_until.slice(0, 10) : "", onchange: (e) => set(u, { valid_until: e.target.value ? new Date(e.target.value + "T23:59:59").toISOString() : null })() });
    const mine = devices.filter((d) => d.user_id === u.id);
    const maxd = h("input", { type: "number", min: 1, max: 100, style: { width: "70px" }, "aria-label": L("डिवाइस सीमा", "Device limit"), value: u.max_devices ?? 2, onchange: async (e) => { try { await ctx.store.adminMaxDevices(u.id, Math.max(1, Math.min(100, +e.target.value || 1))); toast(L("सेव हो गया", "Saved")); ctx.rerender(); } catch (er) { toast((er && er.message) || "error", "err"); } } });
    const devbox = h("div.admindevs", h("label.fld", h("span", L(`डिवाइस: ${mine.length} / सीमा`, `Devices: ${mine.length} / limit`)), maxd),
      mine.map((d) => h("span.chip", `${d.name || d.platform || "device"} · ${dateFmt(d.last_seen)} `, h("button.link", { title: L("यह डिवाइस हटाएँ", "Remove this device"), onclick: async () => { try { await ctx.store.removeDevice(d.id); ctx.rerender(); } catch (er) { toast((er && er.message) || "error", "err"); } } }, "✕"))));
    list.append(h("div.card.adminrow", { "data-status": u.status },
      h("div.adminwho", h("b", u.email || u.display_name || u.id), h("small", `${L(...STATUS[u.status])}${u.is_admin ? " · Admin" : ""} · ${dateFmt(u.created_at)}`)),
      h("label.fld", h("span", L("प्लान", "Plan")), plan), h("label.fld", h("span", L("कब तक मान्य (खाली = हमेशा)", "Valid until (empty = always)")), date),
      h("div.btnrow",
        u.status !== "approved" ? h("button.primary", { onclick: set(u, { status: "approved" }) }, L("मंज़ूर करें", "Approve")) : null,
        u.status !== "blocked" && !me ? h("button.ghost", { onclick: set(u, { status: "blocked" }) }, L("रोकें", "Block")) : null,
        !me ? h("button.ghost", { onclick: set(u, { make_admin: !u.is_admin }) }, u.is_admin ? L("एडमिन हटाएँ", "Remove admin") : L("एडमिन बनाएँ", "Make admin")) : null),
      devbox));
  }
  wrap.append(list);
  return wrap;
}
